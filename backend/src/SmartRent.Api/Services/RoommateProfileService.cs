using Microsoft.EntityFrameworkCore;
using Npgsql;
using SmartRent.Api.Contracts;
using SmartRent.Domain.Entities;
using SmartRent.Domain.Enums;
using SmartRent.Infrastructure.Persistence;

namespace SmartRent.Api.Services;

/// <summary>
/// Hồ sơ ở ghép của chính Người thuê — BP-11, FR-105 đến FR-107, FR-117, api-design mục 15. Mỗi Người thuê một hồ
/// sơ, truy theo <c>tenant_user_id</c> lấy từ token nên không có id trong đường dẫn. Hồ sơ ở ghép không ghi
/// audit_logs (không thuộc BR-23) và không gửi thông báo.
/// </summary>
public class RoommateProfileService
{
    private const string NoProfileMessage = "Bạn chưa có hồ sơ ở ghép.";

    private readonly AppDbContext _db;
    private readonly LocationCatalog _locations;

    public RoommateProfileService(AppDbContext db, LocationCatalog locations)
    {
        _db = db;
        _locations = locations;
    }

    public async Task<ServiceResult<RoommateProfileResponse>> GetMineAsync(
        long tenantUserId,
        CancellationToken cancellationToken = default)
    {
        var profile = await _db.RoommateProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.TenantUserId == tenantUserId, cancellationToken);

        return profile is null
            ? ServiceResult<RoommateProfileResponse>.Fail(StatusCodes.Status404NotFound, NoProfileMessage)
            : ServiceResult<RoommateProfileResponse>.Ok(ToResponse(profile));
    }

    /// <summary>
    /// FR-105, FR-107, FR-109: chưa có hồ sơ thì tạo (đang tìm), đã có thì sửa; <see cref="UpsertResult.Created"/>
    /// cho controller chọn 201 hay 200. Sửa không đổi trạng thái tìm.
    /// </summary>
    public async Task<ServiceResult<UpsertResult>> UpsertAsync(
        long tenantUserId,
        RoommateProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        if (await HasBlockingContractAsync(tenantUserId, cancellationToken))
        {
            return ServiceResult<UpsertResult>.Fail(
                StatusCodes.Status409Conflict,
                "Bạn đang có hợp đồng thuê đang hiệu lực nên chưa tạo hoặc sửa được hồ sơ ở ghép.");
        }

        var city = LocationCatalog.Normalize(request.City);
        var ward = request.Ward is null ? null : LocationCatalog.Normalize(request.Ward);

        var knownLocation = ward is null ? _locations.ContainsCity(city) : _locations.Contains(city, ward);

        if (!knownLocation)
        {
            return ServiceResult<UpsertResult>.Fail(
                StatusCodes.Status422UnprocessableEntity,
                "Tỉnh/thành hoặc phường/xã không có trong danh mục địa giới.");
        }

        var profile = await _db.RoommateProfiles
            .FirstOrDefaultAsync(p => p.TenantUserId == tenantUserId, cancellationToken);

        var created = profile is null;

        if (profile is null)
        {
            profile = RoommateProfile.CreateFor(tenantUserId);
            _db.RoommateProfiles.Add(profile);
        }

        profile.Gender = request.Gender!.Value;
        profile.PreferredRoommateGender = request.PreferredRoommateGender!.Value;
        profile.City = city;
        profile.Ward = ward;
        profile.BudgetMin = request.BudgetMin!.Value;
        profile.BudgetMax = request.BudgetMax!.Value;
        profile.SleepTime = request.SleepTime!.Value;
        profile.Smokes = request.Smokes!.Value;
        profile.HasPet = request.HasPet!.Value;
        profile.Cooking = request.Cooking!.Value;
        profile.NoiseLevel = request.NoiseLevel!.Value;
        profile.OccupationType = request.OccupationType!.Value;
        profile.OrganizationName = request.OrganizationName.Trim();
        profile.MoveInFrom = request.MoveInFrom!.Value;
        profile.Visibility = request.Visibility!.Value;
        profile.UpdatedAt = DateTimeOffset.UtcNow;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Hai request tạo hồ sơ gần như đồng thời: unique index trên tenant_user_id chặn bên sau.
            return ServiceResult<UpsertResult>.Fail(
                StatusCodes.Status409Conflict,
                "Hồ sơ ở ghép của bạn vừa được tạo ở một thao tác khác. Tải lại rồi thử lại.");
        }

        return ServiceResult<UpsertResult>.Ok(new UpsertResult(ToResponse(profile), created));
    }

    /// <summary>FR-106: tạm dừng hoặc tiếp tục tìm. Không tính là sửa hồ sơ nên không đổi <c>updated_at</c>.</summary>
    public async Task<ServiceResult> SetSearchingAsync(
        long tenantUserId,
        bool isSearching,
        CancellationToken cancellationToken = default)
    {
        var updated = await _db.RoommateProfiles
            .Where(p => p.TenantUserId == tenantUserId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.IsSearching, isSearching), cancellationToken);

        return updated == 0
            ? ServiceResult.Fail(StatusCodes.Status404NotFound, NoProfileMessage)
            : ServiceResult.Ok();
    }

    /// <summary>
    /// FR-106, FR-117: xóa hẳn hồ sơ; mọi lời mời đang chờ người gọi gửi đi hoặc nhận được chuyển Đã rút. Kết nối
    /// đã chấp nhận gắn với tài khoản nên vẫn giữ.
    /// </summary>
    public async Task<ServiceResult> DeleteMineAsync(long tenantUserId, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);

        var profile = await _db.RoommateProfiles
            .FirstOrDefaultAsync(p => p.TenantUserId == tenantUserId, cancellationToken);

        if (profile is null)
        {
            return ServiceResult.Fail(StatusCodes.Status404NotFound, NoProfileMessage);
        }

        var pendingInvitations = await _db.RoommateInvitations
            .Where(i => (i.SenderUserId == tenantUserId || i.RecipientUserId == tenantUserId)
                        && i.Status == RoommateInvitationStatus.ChoPhanHoi)
            .ToListAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;

        foreach (var invitation in pendingInvitations)
        {
            invitation.Withdraw(now);
        }

        _db.RoommateProfiles.Remove(profile);

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return ServiceResult.Ok();
    }

    /// <summary>
    /// Phần không định danh của hồ sơ người khác (FR-114). Mọi chỗ trả hồ sơ người khác — xem một hồ sơ, danh sách
    /// ứng viên — phải đi qua hàm này, không tự dựng DTO.
    /// </summary>
    public static RoommateProfilePublicResponse ToPublicResponse(RoommateProfile profile) => new(
        profile.Id,
        profile.Gender,
        profile.PreferredRoommateGender,
        profile.City,
        profile.Ward,
        profile.BudgetMin,
        profile.BudgetMax,
        profile.SleepTime,
        profile.Smokes,
        profile.HasPet,
        profile.Cooking,
        profile.NoiseLevel,
        profile.OccupationType,
        profile.OrganizationName,
        profile.MoveInFrom,
        profile.UpdatedAt);

    /// <summary>FR-107: người gọi đang có hợp đồng Đang hiệu lực.</summary>
    private Task<bool> HasBlockingContractAsync(long tenantUserId, CancellationToken cancellationToken)
        => _db.Contracts.AnyAsync(
            c => c.TenantUserId == tenantUserId && c.Status == RoommateProfile.BlockingContractStatus,
            cancellationToken);

    private static RoommateProfileResponse ToResponse(RoommateProfile profile) => new(
        profile.Id,
        profile.Gender,
        profile.PreferredRoommateGender,
        profile.City,
        profile.Ward,
        profile.BudgetMin,
        profile.BudgetMax,
        profile.SleepTime,
        profile.Smokes,
        profile.HasPet,
        profile.Cooking,
        profile.NoiseLevel,
        profile.OccupationType,
        profile.OrganizationName,
        profile.MoveInFrom,
        profile.Visibility,
        profile.IsSearching,
        profile.UpdatedAt);

    public record UpsertResult(RoommateProfileResponse Profile, bool Created);
}
