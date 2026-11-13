namespace TravelApp.Api.Features.Expenses;

/// <summary>An expense as the API returns it (field names as in the data model).</summary>
public sealed record ExpenseDto(
    Guid Id,
    Guid TripId,
    Guid CreatedByUserId,
    Guid PaidByUserId,
    string Scope,
    Guid? OwnerUserId,
    string Title,
    string Category,
    long AmountMinor,
    string Currency,
    DateTimeOffset SpentAt,
    DateOnly FxRateDate,
    Guid? PlaceId,
    string? Note,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt,
    long Version);

/// <summary>The expenses of one trip that are not deleted, newest first.</summary>
public sealed record TripExpensesResponse(IReadOnlyList<ExpenseDto> Expenses);
