using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SmartRent.Infrastructure.Ai;

/// <summary>
/// Gọi thẳng REST API <c>generateContent</c> của Google Gemini bằng HttpClient, không dùng thư viện ngoài
/// (architecture.md mục 5). Thiếu key thì không chặn ứng dụng khởi động — chỉ lần gọi AI báo không dùng được.
/// </summary>
public class GeminiClient : IAiClient
{
    /// <summary>Mỗi lần gọi Gemini chờ tối đa 10 giây (FR-122).</summary>
    public static readonly TimeSpan AttemptTimeout = TimeSpan.FromSeconds(10);

    /// <summary>Tổng thời gian chờ, tính cả lần gọi lại, không quá 15 giây (FR-122).</summary>
    public static readonly TimeSpan TotalTimeout = TimeSpan.FromSeconds(15);

    /// <summary>Gemini trả 500 hoặc 503 thì chờ 1 giây rồi gọi lại đúng một lần (FR-122).</summary>
    public static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(1);

    public const string BaseAddress = "https://generativelanguage.googleapis.com/v1beta/";

    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly HttpClient _http;
    private readonly GeminiOptions _options;
    private readonly ILogger<GeminiClient> _logger;

    public GeminiClient(HttpClient http, IOptions<GeminiOptions> options, ILogger<GeminiClient> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<string> GenerateAsync(AiRequest request, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var text = await CallWithRetryAsync(request, stopwatch, cancellationToken);

            // Chỉ ghi thời điểm (có sẵn trong log), endpoint và kết quả — không ghi câu hỏi, câu trả lời (FR-123).
            _logger.LogInformation(
                "Goi AI {Operation} thanh cong sau {ElapsedMs} ms",
                request.Operation, stopwatch.ElapsedMilliseconds);

            return text;
        }
        catch (AiUnavailableException ex)
        {
            _logger.LogWarning(
                "Goi AI {Operation} loi sau {ElapsedMs} ms: {Reason}",
                request.Operation, stopwatch.ElapsedMilliseconds, ex.Message);
            throw;
        }
    }

    private async Task<string> CallWithRetryAsync(
        AiRequest request, Stopwatch stopwatch, CancellationToken cancellationToken)
    {
        try
        {
            return await CallAsync(request, AttemptTimeout, cancellationToken);
        }
        catch (GeminiServerErrorException ex)
        {
            // Gemini quá tải hoặc lỗi máy chủ thường trả về ngay và hết sau vài giây, nên gọi lại một lần.
            // Quá thời gian chờ, 429, 400, 401, 403, 404 không gọi lại: lần sau cũng không khác.
            _logger.LogWarning(
                "Goi AI {Operation} loi sau {ElapsedMs} ms: {Reason}, goi lai sau {DelayMs} ms",
                request.Operation, stopwatch.ElapsedMilliseconds, ex.Message, RetryDelay.TotalMilliseconds);
        }

        await Task.Delay(RetryDelay, cancellationToken);

        // Lần gọi lại chỉ dùng phần còn lại của tổng 15 giây; lần đầu chờ tối đa 10 giây nên luôn còn ít nhất 4 giây.
        var remaining = TotalTimeout - stopwatch.Elapsed;

        if (remaining <= TimeSpan.Zero)
        {
            throw new AiUnavailableException("Qua thoi gian cho Gemini");
        }

        return await CallAsync(
            request, remaining < AttemptTimeout ? remaining : AttemptTimeout, cancellationToken);
    }

    private async Task<string> CallAsync(
        AiRequest request, TimeSpan attemptTimeout, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new AiUnavailableException(
                "Thieu Gemini:ApiKey. Dat bang: dotnet user-secrets set \"Gemini:ApiKey\" \"...\"");
        }

        if (string.IsNullOrWhiteSpace(_options.Model))
        {
            throw new AiUnavailableException("Thieu Gemini:Model trong appsettings.json");
        }

        var body = new GenerateContentRequest(
            SystemInstruction: new Content(null, [new Part(request.SystemInstruction)]),
            Contents: [new Content("user", [new Part(request.UserContent)])],
            GenerationConfig: request.ResponseJsonSchema is null
                ? null
                : new GenerationConfig("application/json", request.ResponseJsonSchema));

        using var message = new HttpRequestMessage(
            HttpMethod.Post,
            $"models/{Uri.EscapeDataString(_options.Model)}:generateContent");

        // Key đi trong header, không nằm trong URL, để không lọt vào log của HttpClient.
        message.Headers.Add("x-goog-api-key", _options.ApiKey);
        message.Content = JsonContent.Create(body, options: SerializerOptions);

        // Hết thời gian của lần gọi này thì hủy; người gọi tự hủy thì để OperationCanceledException đi tiếp.
        using var attempt = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        attempt.CancelAfter(attemptTimeout);

        HttpResponseMessage response;

        try
        {
            response = await _http.SendAsync(message, attempt.Token);
        }
        catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new AiUnavailableException("Qua thoi gian cho Gemini", ex);
        }
        catch (HttpRequestException ex)
        {
            throw new AiUnavailableException($"Khong ket noi duoc Gemini: {ex.Message}", ex);
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                // Không ghi body lỗi: chỉ cần mã trạng thái để biết hết hạn mức hay sai key.
                if (response.StatusCode is HttpStatusCode.InternalServerError or HttpStatusCode.ServiceUnavailable)
                {
                    throw new GeminiServerErrorException($"Gemini loi ({(int)response.StatusCode})");
                }

                throw new AiUnavailableException(response.StatusCode switch
                {
                    HttpStatusCode.TooManyRequests => "Gemini het han muc (429)",
                    HttpStatusCode.BadRequest or HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden or HttpStatusCode.NotFound
                        => $"Gemini tu choi yeu cau ({(int)response.StatusCode}) — kiem tra Gemini:ApiKey va Gemini:Model",
                    _ => $"Gemini loi ({(int)response.StatusCode})"
                });
            }

            GenerateContentResponse? result;

            try
            {
                result = await response.Content.ReadFromJsonAsync<GenerateContentResponse>(
                    SerializerOptions, attempt.Token);
            }
            catch (OperationCanceledException ex) when (!cancellationToken.IsCancellationRequested)
            {
                throw new AiUnavailableException("Qua thoi gian cho Gemini", ex);
            }
            catch (JsonException ex)
            {
                throw new AiUnavailableException("Gemini tra ve du lieu khong doc duoc", ex);
            }

            return ExtractText(result);
        }
    }

    private static string ExtractText(GenerateContentResponse? result)
    {
        if (result?.PromptFeedback?.BlockReason is { } blockReason)
        {
            throw new AiUnavailableException($"Gemini chan cau hoi: {blockReason}");
        }

        var candidate = result?.Candidates?.FirstOrDefault();

        // MAX_TOKENS, SAFETY... đều là câu trả lời dở dang hoặc bị chặn — không dùng được, nhất là khi cần JSON.
        if (candidate is null || candidate.FinishReason is not (null or "STOP"))
        {
            throw new AiUnavailableException(
                $"Gemini khong tra loi tron ven: {candidate?.FinishReason ?? "khong co candidate"}");
        }

        var text = new StringBuilder();

        foreach (var part in candidate.Content?.Parts ?? [])
        {
            text.Append(part.Text);
        }

        if (string.IsNullOrWhiteSpace(text.ToString()))
        {
            throw new AiUnavailableException("Gemini tra ve cau tra loi rong");
        }

        return text.ToString();
    }

    /// <summary>Gemini trả 500 hoặc 503 — lỗi duy nhất được gọi lại một lần.</summary>
    private sealed class GeminiServerErrorException(string message) : AiUnavailableException(message);

    // ------------------------------------------------------- Body gửi đi và nhận về

    private sealed record GenerateContentRequest(
        Content SystemInstruction,
        IReadOnlyList<Content> Contents,
        GenerationConfig? GenerationConfig);

    private sealed record Content(string? Role, IReadOnlyList<Part>? Parts);

    private sealed record Part(string? Text);

    private sealed record GenerationConfig(string ResponseMimeType, object ResponseJsonSchema);

    private sealed record GenerateContentResponse(
        IReadOnlyList<Candidate>? Candidates,
        PromptFeedback? PromptFeedback);

    private sealed record Candidate(Content? Content, string? FinishReason);

    private sealed record PromptFeedback(string? BlockReason);
}
