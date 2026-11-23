using System.Text.Json.Serialization;

namespace SmartRent.Api.Contracts;

/// <summary>Loại trường trong danh mục trường (FR-112).</summary>
[JsonConverter(typeof(JsonStringEnumConverter<SchoolType>))]
public enum SchoolType
{
    DaiHoc,
    CaoDang
}

/// <summary>
/// Một trường trong danh mục trường của <c>GET /schools</c> (api-design mục 15): mã cố định, tên đầy đủ (trường
/// thành viên kèm đại học chủ quản), loại, nơi đặt trụ sở và các tên viết tắt để tìm.
/// </summary>
public record SchoolResponse(string Code, string Name, SchoolType Type, string? City, IReadOnlyList<string> Aliases);
