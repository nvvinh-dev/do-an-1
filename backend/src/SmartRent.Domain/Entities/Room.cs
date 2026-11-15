using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Phòng trọ. Ba cột giá ở đây là giá hiện hành, dùng khi lập hợp đồng mới.
/// Sửa giá không ảnh hưởng hợp đồng đang hiệu lực và hóa đơn đã phát hành.
/// </summary>
public class Room
{
    public long Id { get; set; }

    public long PropertyId { get; set; }

    public Property Property { get; set; } = null!;

    /// <summary>Mã hoặc tên phòng, duy nhất trong một khu trọ.</summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>Diện tích, đơn vị mét vuông.</summary>
    public decimal Area { get; set; }

    public int MaxOccupants { get; set; }

    public decimal RentPrice { get; set; }

    public decimal ElectricityUnitPrice { get; set; }

    public decimal WaterUnitPrice { get; set; }

    public string? Description { get; set; }

    public RoomOccupancyStatus OccupancyStatus { get; set; }

    /// <summary>Phòng mới tạo chưa hiển thị cho tới khi Chủ trọ chủ động bật (BP-03).</summary>
    public RoomVisibilityStatus VisibilityStatus { get; set; } = RoomVisibilityStatus.DaAnBoiChuTro;

    /// <summary>Phòng đã lưu trữ chỉ còn xem được. Lưu trữ là vĩnh viễn (BR-10, FR-20).</summary>
    public bool IsArchived => OccupancyStatus == RoomOccupancyStatus.LuuTru;

    /// <summary>
    /// Chủ trọ chỉ tự chuyển giữa Trống và Bảo trì (FR-89); các trạng thái khác do hệ thống chuyển.
    /// Về Trống thì hợp đồng hiện tại phải đã ở Đã thanh lý hoặc Đã hủy (BR-08, FR-18).
    /// </summary>
    /// <param name="hasOpenContract">Phòng còn hợp đồng chưa ở Đã thanh lý hoặc Đã hủy.</param>
    public bool CanChangeOccupancyTo(RoomOccupancyStatus target, bool hasOpenContract)
        => (OccupancyStatus, target) switch
        {
            (RoomOccupancyStatus.Trong, RoomOccupancyStatus.BaoTri) => true,
            (RoomOccupancyStatus.BaoTri, RoomOccupancyStatus.Trong) => !hasOpenContract,
            _ => false
        };

    /// <summary>
    /// Chủ trọ bật hoặc tắt được hiển thị, trừ khi tin đang bị Admin ẩn hoặc phòng đã lưu trữ (FR-15).
    /// Bật hiển thị còn cần phòng có ít nhất một ảnh — service kiểm tra vì cần đếm ảnh.
    /// </summary>
    public bool CanChangeVisibility => !IsArchived && VisibilityStatus != RoomVisibilityStatus.DaAnBoiAdmin;

    /// <summary>
    /// FR-59: hoàn tất thanh lý thì phòng đang thuê chuyển Bảo trì — nếu cần dọn dẹp, sửa chữa — hoặc về thẳng Trống,
    /// theo lựa chọn của Chủ trọ.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// Phòng không ở Đang thuê hoặc trạng thái đích không phải Trống, Bảo trì — service đã kiểm tra trước, tới đây là lỗi
    /// lập trình hoặc dữ liệu sai.
    /// </exception>
    public void ReleaseAfterSettlement(RoomOccupancyStatus next)
    {
        if (OccupancyStatus != RoomOccupancyStatus.DangThue
            || next is not (RoomOccupancyStatus.Trong or RoomOccupancyStatus.BaoTri))
        {
            throw new InvalidOperationException(
                $"Phòng {Id} ở trạng thái {OccupancyStatus}: không chuyển sang {next} khi hoàn tất thanh lý được.");
        }

        OccupancyStatus = next;
    }

    /// <summary>Phòng chỉ lưu trữ được khi đang Trống hoặc Bảo trì (FR-20).</summary>
    public bool CanBeArchived => OccupancyStatus is RoomOccupancyStatus.Trong or RoomOccupancyStatus.BaoTri;

    /// <summary>Phòng đang giữ chỗ hoặc đang thuê thì khu trọ chứa nó chưa lưu trữ được (BR-10).</summary>
    public bool BlocksPropertyArchive => OccupancyStatus is RoomOccupancyStatus.DangGiuCho or RoomOccupancyStatus.DangThue;

    /// <summary>
    /// BR-05 — phòng xuất hiện trong kết quả tìm kiếm khi đủ cả bốn điều kiện: phòng Trống, đang bật hiển thị,
    /// khu trọ đang khai thác và Chủ trọ không bị khóa. Nhận giá trị rời để dùng được với dữ liệu đã chiếu từ truy vấn.
    /// Lọc trong SQL (tìm kiếm, chi tiết công khai, gửi yêu cầu thuê) dùng <c>RoomQueryExtensions.WhereListed</c>
    /// ở SmartRent.Api — cùng bốn điều kiện, đổi BR-05 thì sửa cả hai.
    /// </summary>
    public static bool IsListed(
        RoomOccupancyStatus occupancyStatus,
        RoomVisibilityStatus visibilityStatus,
        PropertyStatus propertyStatus,
        bool landlordLocked)
        => occupancyStatus == RoomOccupancyStatus.Trong
           && visibilityStatus == RoomVisibilityStatus.DangHienThi
           && propertyStatus == PropertyStatus.DangKhaiThac
           && !landlordLocked;

    public ICollection<RoomServiceFee> ServiceFees { get; set; } = [];

    public ICollection<RoomImage> Images { get; set; } = [];

    public ICollection<RoomAmenity> Amenities { get; set; } = [];
}
