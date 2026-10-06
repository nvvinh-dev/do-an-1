namespace SmartRent.Api.Contracts;

/// <summary>Một tỉnh/thành và các phường/xã của nó, theo danh mục đơn vị hành chính 2 cấp hiện hành.</summary>
public record LocationResponse(string City, IReadOnlyList<string> Wards);
