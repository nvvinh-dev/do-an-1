using System.Text.Json;
using SmartRent.Domain.Entities;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>
/// Ghi nhật ký cho các thao tác thuộc danh sách BR-23.
/// Chỉ thêm bản ghi vào DbContext chứ không lưu — để nhật ký nằm cùng transaction
/// với chính thao tác nghiệp vụ. Ghi được nhật ký mà thao tác thất bại, hoặc ngược lại,
/// đều làm nhật ký mất giá trị đối chứng.
/// </summary>
public class AuditLogger
{
    private readonly AppDbContext _db;

    public AuditLogger(AppDbContext db)
    {
        _db = db;
    }

    public void Write(
        long actorUserId,
        string action,
        string entityType,
        long entityId,
        object? oldValue = null,
        object? newValue = null)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            ActorUserId = actorUserId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            OldValue = oldValue is null ? null : JsonSerializer.Serialize(oldValue),
            NewValue = newValue is null ? null : JsonSerializer.Serialize(newValue),
            OccurredAt = DateTimeOffset.UtcNow
        });
    }
}
