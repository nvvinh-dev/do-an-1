using Microsoft.EntityFrameworkCore;

namespace SmartRent.Infrastructure.Persistence;

/// <summary>
/// Khóa dòng phòng và khu trọ (<c>SELECT … FOR UPDATE</c> / <c>FOR SHARE</c>) cho thao tác chạy đồng thời.
/// Hai bảng này không có concurrency token như hợp đồng, yêu cầu thuê: có thao tác chỉ đổi bảng con (bỏ hết ảnh phòng)
/// nên <c>xmin</c> của dòng phòng không đổi và không bị kiểm. Thay vào đó, thao tác ghi khóa dòng ngay sau khi mở
/// transaction, rồi mới nạp và kiểm điều kiện: thao tác chạy sau chờ thao tác trước xong và đọc trạng thái mới.
/// Khóa giữ tới khi transaction kết thúc, nên phải gọi khi đã mở transaction và trước khi nạp entity vào DbContext —
/// entity nạp trước khi khóa giữ giá trị cũ.
/// Thứ tự khóa: khu trọ rồi tới phòng, nhiều phòng thì theo id — để hai thao tác không chờ nhau vòng tròn.
/// </summary>
public static class PropertyRowLocks
{
    /// <summary>Đổi thông tin, trạng thái phòng hoặc lưu trữ phòng.</summary>
    public static Task LockRoomAsync(this AppDbContext db, long roomId, CancellationToken cancellationToken)
        => db.ExecuteLockAsync($"SELECT 1 FROM rooms WHERE id = {roomId} FOR UPDATE", cancellationToken);

    /// <summary>
    /// Giữ phòng không bị lưu trữ hoặc giữ chỗ trong lúc thêm bản ghi con (gửi yêu cầu thuê);
    /// nhiều thao tác cùng khóa chia sẻ không chặn nhau.
    /// </summary>
    public static Task LockRoomForShareAsync(this AppDbContext db, long roomId, CancellationToken cancellationToken)
        => db.ExecuteLockAsync($"SELECT 1 FROM rooms WHERE id = {roomId} FOR SHARE", cancellationToken);

    /// <summary>Khóa phòng của một yêu cầu thuê, trước khi nạp yêu cầu (duyệt yêu cầu thuê).</summary>
    public static Task LockRoomOfRentalRequestAsync(
        this AppDbContext db,
        long rentalRequestId,
        CancellationToken cancellationToken)
        => db.ExecuteLockAsync(
            $"SELECT 1 FROM rooms WHERE id = (SELECT room_id FROM rental_requests WHERE id = {rentalRequestId}) FOR UPDATE",
            cancellationToken);

    /// <summary>Đổi thông tin hoặc lưu trữ khu trọ.</summary>
    public static Task LockPropertyAsync(this AppDbContext db, long propertyId, CancellationToken cancellationToken)
        => db.ExecuteLockAsync($"SELECT 1 FROM properties WHERE id = {propertyId} FOR UPDATE", cancellationToken);

    /// <summary>Giữ khu trọ không bị lưu trữ trong lúc thêm phòng; nhiều lượt thêm phòng không chặn nhau.</summary>
    public static Task LockPropertyForShareAsync(this AppDbContext db, long propertyId, CancellationToken cancellationToken)
        => db.ExecuteLockAsync($"SELECT 1 FROM properties WHERE id = {propertyId} FOR SHARE", cancellationToken);

    /// <summary>Mọi phòng của một khu trọ, theo id (lưu trữ khu trọ). Gọi sau <see cref="LockPropertyAsync"/>.</summary>
    public static Task LockRoomsOfPropertyAsync(this AppDbContext db, long propertyId, CancellationToken cancellationToken)
        => db.ExecuteLockAsync(
            $"SELECT 1 FROM rooms WHERE property_id = {propertyId} ORDER BY id FOR UPDATE",
            cancellationToken);

    private static async Task ExecuteLockAsync(
        this AppDbContext db,
        FormattableString sql,
        CancellationToken cancellationToken)
    {
        // Ngoài transaction, khóa nhả ngay khi câu lệnh chạy xong nên không có tác dụng.
        if (db.Database.CurrentTransaction is null)
        {
            throw new InvalidOperationException("Khóa dòng phải chạy trong transaction đã mở.");
        }

        await db.Database.ExecuteSqlInterpolatedAsync(sql, cancellationToken);
    }
}
