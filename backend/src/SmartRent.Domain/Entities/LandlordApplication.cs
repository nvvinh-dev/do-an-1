using SmartRent.Domain.Enums;

namespace SmartRent.Domain.Entities;

/// <summary>
/// Hồ sơ đăng ký làm Chủ trọ. Ảnh giấy tờ chỉ được trả cho Admin khi duyệt hồ sơ.
/// </summary>
public class LandlordApplication
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public string IdCardNumber { get; set; } = string.Empty;

    public string IdCardFrontUrl { get; set; } = string.Empty;

    public string IdCardBackUrl { get; set; } = string.Empty;

    public string OwnershipDocumentUrl { get; set; } = string.Empty;

    public LandlordApplicationStatus Status { get; set; }

    public DateTimeOffset SubmittedAt { get; set; }

    public long? ReviewedByUserId { get; set; }

    public DateTimeOffset? ReviewedAt { get; set; }

    /// <summary>Bắt buộc có giá trị khi <see cref="Status"/> là TuChoi.</summary>
    public string? RejectReason { get; set; }
}
