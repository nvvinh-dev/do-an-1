namespace SmartRent.Api.Contracts;

public record UserListItemResponse(
    long Id,
    string Email,
    string FullName,
    string? PhoneNumber,
    bool IsLocked,
    string? LockReason,
    DateTimeOffset RegisteredAt,
    IReadOnlyList<string> Roles);

public record LockUserRequest(string Reason);
