using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TravelApp.Api.Data;
using TravelApp.Api.Features.Trips;

namespace TravelApp.Api.Features.Expenses;

/// <summary>Expenses, backend side (KAN-43): the rules of data model section 13 and reading a trip's expenses.</summary>
internal sealed partial class ExpensesService(AppDbContext db, ITripWriteRules trips) : ITripDeleteHook
{
    /// <summary>The checks for one expense after the phone's columns were applied. Problems use column names.</summary>
    public static IReadOnlyDictionary<string, string[]> Check(Expense expense, Guid? oldTripId, bool isNew)
    {
        var problems = new Dictionary<string, List<string>>();
        void Add(string column, string message)
        {
            if (!problems.TryGetValue(column, out var list)) problems[column] = list = [];
            list.Add(message);
        }

        if (string.IsNullOrWhiteSpace(expense.Title)) Add("title", "The expense needs a name.");
        else if (expense.Title.Length > ExpenseValues.TitleMax) Add("title", $"The name can be up to {ExpenseValues.TitleMax} characters.");
        if (expense.Note?.Length > ExpenseValues.NoteMax) Add("note", $"Up to {ExpenseValues.NoteMax} characters.");
        if (!ExpenseValues.Scopes.Contains(expense.Scope)) Add("scope", "Scope must be shared or personal.");
        if (!ExpenseValues.Categories.Contains(expense.Category))
            Add("category", "Category must be food, transport, stay, activities, shopping or other.");
        if (expense.AmountMinor <= 0) Add("amount_minor", "The amount must be more than 0.");
        else if (expense.AmountMinor > ExpenseValues.AmountMinorMax) Add("amount_minor", "The amount is too large.");
        if (!CurrencyCode().IsMatch(expense.Currency)) Add("currency", "Use a 3-letter ISO currency code.");
        if (expense.TripId == Guid.Empty) Add("trip_id", "An expense needs its trip.");
        if (expense.PlaceId is not null) Add("place_id", "Linking an expense to a place is not available yet.");

        var spentDay = DateOnly.FromDateTime(expense.SpentAt.UtcDateTime);
        if (expense.SpentAt == default) Add("spent_at", "An expense needs the time it was paid.");
        else if (Math.Abs(expense.FxRateDate.DayNumber - spentDay.DayNumber) > ExpenseValues.FxDateSlackDays)
            Add("fx_rate_date", "The rate date must be the day the expense was paid.");

        if (!isNew && oldTripId is { } before && before != expense.TripId)
            Add("trip_id", "An expense cannot move to another trip.");

        return problems.ToDictionary(p => p.Key, p => p.Value.ToArray());
    }

    /// <summary>True when the user may change the expense: the trip is theirs, and a personal expense is their own.</summary>
    public async Task<bool> CanWriteAsync(Guid userId, Expense expense, CancellationToken ct)
    {
        if (expense.Scope == ExpenseValues.Personal && expense.OwnerUserId is { } owner && owner != userId) return false;
        return await trips.OwnsTripAsync(userId, expense.TripId, ct);
    }

    /// <summary>The trip's expenses, or null when the trip is not the user's.</summary>
    public async Task<TripExpensesResponse?> ListForTripAsync(Guid userId, Guid tripId, CancellationToken ct)
    {
        if (!await trips.OwnsTripAsync(userId, tripId, ct)) return null;
        var expenses = await db.Set<Expense>().AsNoTracking()
            .Where(e => e.TripId == tripId && e.DeletedAt == null && (e.Scope == ExpenseValues.Shared || e.OwnerUserId == userId))
            .OrderByDescending(e => e.SpentAt).ThenByDescending(e => e.CreatedAt).ThenByDescending(e => e.Id)
            .ToListAsync(ct);
        return new TripExpensesResponse(expenses.Select(ToDto).ToList());
    }

    /// <summary>A deleted trip takes its expenses with it (soft delete, so phones see it).</summary>
    public Task TripDeletedAsync(Guid tripId, DateTimeOffset at, CancellationToken ct) =>
        db.Set<Expense>().Where(e => e.TripId == tripId && e.DeletedAt == null)
            .ExecuteUpdateAsync(u => u.SetProperty(e => e.DeletedAt, at).SetProperty(e => e.UpdatedAt, at).SetProperty(e => e.Version, e => e.Version + 1), ct);

    public static ExpenseDto ToDto(Expense e) => new(e.Id, e.TripId, e.CreatedByUserId, e.PaidByUserId, e.Scope, e.OwnerUserId,
        e.Title, e.Category, e.AmountMinor, e.Currency, e.SpentAt, e.FxRateDate, e.PlaceId, e.Note,
        e.CreatedAt, e.UpdatedAt, e.DeletedAt, e.Version);

    [GeneratedRegex("^[A-Z]{3}$")]
    private static partial Regex CurrencyCode();
}
