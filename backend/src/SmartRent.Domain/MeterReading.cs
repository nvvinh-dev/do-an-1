namespace SmartRent.Domain;

/// <summary>
/// Chỉ số đồng hồ điện hoặc nước của một kỳ. <see cref="Previous"/> do hệ thống tự điền: chỉ số mới
/// của kỳ liền trước, kỳ đầu tiên lấy chỉ số lúc bàn giao ghi trong hợp đồng (BR-14).
/// </summary>
public readonly record struct MeterReading(decimal Previous, decimal Current)
{
    /// <summary>Chỉ số mới không được nhỏ hơn chỉ số cũ (BR-14, FR-39).</summary>
    public bool IsValid => throw new NotImplementedException();
}
