using System.Globalization;
using Microsoft.Maui.Graphics;
using ObjectiveReacherMAUI.Models;

namespace ObjectiveReacherMAUI.ViewModels;

public sealed class EntryRowViewModel
{
    public EntryRowViewModel(ObjectiveEntry entry)
    {
        Description = entry.Description;
        Amount = entry.Amount;
        var localTime = entry.CreatedAt.LocalDateTime;
        TimeText = localTime.Date == DateTime.Today
            ? $"Hoy, {localTime:HH:mm}"
            : localTime.Date == DateTime.Today.AddDays(-1)
                ? $"Ayer, {localTime:HH:mm}"
                : localTime.ToString("MMM d, HH:mm", CultureInfo.GetCultureInfo("es-ES"));
    }

    public string Description { get; }

    public decimal Amount { get; }

    public string TimeText { get; }

    public string Symbol => Amount >= 0 ? "🟢" : "🔴";

    public string AmountText => $"{(Amount >= 0 ? "+" : "−")}{FormatCurrency(Math.Abs(Amount))}";

    public Color AmountColor => Color.FromArgb(Amount >= 0 ? "#65DB85" : "#F27783");

    private static string FormatCurrency(decimal amount) => $"${amount.ToString("N0", CultureInfo.CurrentCulture)}";
}
