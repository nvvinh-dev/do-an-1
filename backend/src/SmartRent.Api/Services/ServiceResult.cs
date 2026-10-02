namespace SmartRent.Api.Services;

/// <summary>
/// Kết quả của một thao tác nghiệp vụ. Service dùng kiểu này cho các thất bại
/// lường trước được — sai mật khẩu, không đủ quyền, sai trạng thái — thay vì ném exception.
/// Controller chỉ việc ánh xạ <see cref="StatusCode"/> sang mã HTTP.
/// </summary>
public class ServiceResult
{
    protected ServiceResult(bool succeeded, int statusCode, string? error)
    {
        Succeeded = succeeded;
        StatusCode = statusCode;
        Error = error;
    }

    public bool Succeeded { get; }

    public int StatusCode { get; }

    public string? Error { get; }

    public static ServiceResult Ok() => new(true, StatusCodes.Status200OK, null);

    public static ServiceResult Fail(int statusCode, string error) => new(false, statusCode, error);
}

public class ServiceResult<T> : ServiceResult
{
    private ServiceResult(bool succeeded, int statusCode, string? error, T? value)
        : base(succeeded, statusCode, error)
    {
        Value = value;
    }

    public T? Value { get; }

    public static ServiceResult<T> Ok(T value) => new(true, StatusCodes.Status200OK, null, value);

    public static new ServiceResult<T> Fail(int statusCode, string error)
        => new(false, statusCode, error, default);
}
