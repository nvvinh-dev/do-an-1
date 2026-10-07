using System.Text.Json;

namespace SmartRent.Api.Contracts;

/// <summary>
/// Bộ lọc tra cứu nhật ký — FR-64: theo đối tượng, người thực hiện, loại thao tác và khoảng thời gian.
/// Mọi trường tùy chọn; <see cref="From"/> và <see cref="To"/> là thời điểm ISO 8601, tính cả hai đầu mút.
/// </summary>
public record AuditLogFilter(
    string? EntityType,
    long? EntityId,
    long? ActorUserId,
    string? Action,
    DateTimeOffset? From,
    DateTimeOffset? To);

public record AuditLogActorResponse(long Id, string FullName, string? Email);

/// <summary>
/// Một dòng nhật ký. <see cref="OldValue"/> và <see cref="NewValue"/> là JSON đúng như đã ghi,
/// trừ số tài khoản ngân hàng chỉ còn 4 chữ số cuối; null khi thao tác không ghi giá trị đó.
/// </summary>
public record AuditLogResponse(
    long Id,
    AuditLogActorResponse Actor,
    string Action,
    string EntityType,
    long EntityId,
    JsonElement? OldValue,
    JsonElement? NewValue,
    DateTimeOffset OccurredAt);
