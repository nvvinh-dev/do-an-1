namespace SmartRent.Domain;

/// <summary>
/// Giới hạn của cột tiền <c>numeric(14,2)</c> (database-design mục 1). Từng số client gửi đã qua validator, nhưng khoản
/// server tính từ nhiều số — tiền điện từ chỉ số, tổng từ nhiều dòng — vẫn có thể vượt cột. Service kiểm tra trước khi
/// lưu và trả 422, không để database báo tràn số.
/// </summary>
public static class MoneyLimits
{
    /// <summary>Trị tuyệt đối lớn nhất cột numeric(14,2) chứa được: 12 chữ số phần nguyên, 2 chữ số thập phân.</summary>
    public const decimal MaxAmount = 999_999_999_999.99m;

    public static bool Fits(decimal amount) => Math.Abs(amount) <= MaxAmount;
}
