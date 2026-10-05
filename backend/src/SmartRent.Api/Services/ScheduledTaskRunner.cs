namespace SmartRent.Api.Services;

/// <summary>
/// Chạy các tác vụ định kỳ mỗi giờ trong tiến trình Backend API (kiến trúc mục 7). Mỗi tác vụ gọi chính
/// service nghiệp vụ của nó và chạy lại được nhiều lần mà không gây tác dụng phụ lặp lại. Thao tác của người
/// dùng tự kiểm tra hạn, nên tác vụ trễ tối đa một giờ cũng không làm sai nghiệp vụ.
/// </summary>
public class ScheduledTaskRunner : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScheduledTaskRunner> _logger;

    public ScheduledTaskRunner(IServiceScopeFactory scopeFactory, ILogger<ScheduledTaskRunner> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);

        try
        {
            do
            {
                await RunAllAsync(stoppingToken);
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Ứng dụng đang dừng.
        }
    }

    private async Task RunAllAsync(CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        // Hết hạn chạy trước nhắc nhở, để không nhắc cho những bản ghi vừa hết hạn trong lượt này.
        await RunAsync("Het han yeu cau thue chua duyet", cancellationToken,
            sp => sp.GetRequiredService<RentalRequestService>().ExpireUnreviewedAsync(now, cancellationToken));

        await RunAsync("Het han giu cho cua yeu cau thue chua lap hop dong", cancellationToken,
            sp => sp.GetRequiredService<RentalRequestService>().ExpireHeldAsync(now, cancellationToken));

        await RunAsync("Huy hop dong het han giu cho", cancellationToken,
            sp => sp.GetRequiredService<ContractService>().CancelExpiredHoldsAsync(now, cancellationToken));

        await RunAsync("Nhac han giu cho con duoi 24 gio", cancellationToken,
            sp => sp.GetRequiredService<ContractService>().RemindExpiringHoldsAsync(now, cancellationToken));

        await RunAsync("Danh dau hop dong sap het han", cancellationToken,
            sp => sp.GetRequiredService<ContractService>().MarkExpiringSoonAsync(now, cancellationToken));
    }

    /// <summary>Mỗi tác vụ một scope và một DbContext riêng; tác vụ lỗi chỉ ghi log, không chặn các tác vụ sau.</summary>
    private async Task RunAsync(
        string name,
        CancellationToken cancellationToken,
        Func<IServiceProvider, Task<int>> task)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var affected = await task(scope.ServiceProvider);

            if (affected > 0)
            {
                _logger.LogInformation("Tac vu dinh ky {Task}: {Affected} ban ghi", name, affected);
            }
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(ex, "Tac vu dinh ky {Task} that bai", name);
        }
    }
}
