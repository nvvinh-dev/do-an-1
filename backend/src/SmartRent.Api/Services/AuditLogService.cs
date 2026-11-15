using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using SmartRent.Api.Contracts;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>
/// Admin tra cứu nhật ký hệ thống — FR-64. Chỉ đọc: nhật ký chỉ được ghi qua <see cref="AuditLogger"/>
/// và không sửa, xóa được bằng bất kỳ chức năng nào (FR-63, QR-03).
/// </summary>
public class AuditLogService
{
    /// <summary>Hai mã có số tài khoản ngân hàng của Chủ trọ trong giá trị cũ, mới (BR-26).</summary>
    private static readonly HashSet<string> BankAccountActions = ["KhaiBaoTaiKhoanNhanTien", "SuaTaiKhoanNhanTien"];

    private const int VisibleAccountDigits = 4;

    private readonly AppDbContext _db;

    public AuditLogService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Mọi bộ lọc tùy chọn và kết hợp được với nhau; mới nhất trước.</summary>
    public async Task<PagedResponse<AuditLogResponse>> ListAsync(
        AuditLogFilter filter,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _db.AuditLogs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.EntityType))
        {
            var entityType = filter.EntityType.Trim();
            query = query.Where(a => a.EntityType == entityType);
        }

        if (filter.EntityId is not null)
        {
            query = query.Where(a => a.EntityId == filter.EntityId);
        }

        if (filter.ActorUserId is not null)
        {
            query = query.Where(a => a.ActorUserId == filter.ActorUserId);
        }

        if (!string.IsNullOrWhiteSpace(filter.Action))
        {
            var action = filter.Action.Trim();
            query = query.Where(a => a.Action == action);
        }

        // Client gửi giờ Việt Nam (+07:00) hoặc UTC; Npgsql chỉ nhận DateTimeOffset ở UTC cho timestamptz.
        if (filter.From is { } from)
        {
            var fromUtc = from.ToUniversalTime();
            query = query.Where(a => a.OccurredAt >= fromUtc);
        }

        if (filter.To is { } to)
        {
            var toUtc = to.ToUniversalTime();
            query = query.Where(a => a.OccurredAt <= toUtc);
        }

        var total = await query.CountAsync(cancellationToken);

        // Nhiều thao tác lưu cùng lúc có cùng thời điểm; xếp thêm theo id để thứ tự giữa các trang ổn định.
        var rows = await (
                from log in query
                join actor in _db.Users on log.ActorUserId equals actor.Id
                orderby log.OccurredAt descending, log.Id descending
                select new
                {
                    log.Id,
                    ActorId = actor.Id,
                    actor.FullName,
                    actor.Email,
                    log.Action,
                    log.EntityType,
                    log.EntityId,
                    log.OldValue,
                    log.NewValue,
                    log.OccurredAt
                })
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = rows
            .Select(row => new AuditLogResponse(
                row.Id,
                new AuditLogActorResponse(row.ActorId, row.FullName, row.Email),
                row.Action,
                row.EntityType,
                row.EntityId,
                ParseJson(row.Action, row.OldValue),
                ParseJson(row.Action, row.NewValue),
                row.OccurredAt))
            .ToList();

        return new PagedResponse<AuditLogResponse>(
            items, page, pageSize, total, (int)Math.Ceiling(total / (double)pageSize));
    }

    /// <summary>
    /// Trả giá trị cũ, mới dưới dạng JSON thật thay vì chuỗi chứa JSON. Số tài khoản ngân hàng chỉ giữ
    /// 4 chữ số cuối (BR-26); database vẫn lưu đủ số vì nhật ký không sửa được nên không che lúc ghi.
    /// </summary>
    private static JsonElement? ParseJson(string action, string? json)
    {
        if (json is null)
        {
            return null;
        }

        if (BankAccountActions.Contains(action)
            && JsonNode.Parse(json) is JsonObject value
            && value["AccountNumber"] is JsonValue accountNumber
            && accountNumber.TryGetValue<string>(out var digits))
        {
            value["AccountNumber"] = MaskAccountNumber(digits);
            return JsonSerializer.SerializeToElement(value);
        }

        using var document = JsonDocument.Parse(json);
        return document.RootElement.Clone();
    }

    /// <summary><c>0123456789</c> → <c>******6789</c>; số có từ 4 chữ số trở xuống thì che toàn bộ.</summary>
    private static string MaskAccountNumber(string accountNumber)
        => accountNumber.Length <= VisibleAccountDigits
            ? new string('*', accountNumber.Length)
            : new string('*', accountNumber.Length - VisibleAccountDigits) + accountNumber[^VisibleAccountDigits..];
}
