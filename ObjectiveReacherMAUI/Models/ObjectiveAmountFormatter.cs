using System.Globalization;

namespace ObjectiveReacherMAUI.Models;

public static class ObjectiveAmountFormatter
{
    public static string Format(decimal amount, Objective objective)
    {
        ArgumentNullException.ThrowIfNull(objective);

        var unit = ObjectiveUnitCatalog.Find(objective.UnitId);
        var absoluteAmount = Math.Abs(amount);
        var number = unit is null or { Id: ObjectiveUnitCatalog.CustomId }
            ? absoluteAmount.ToString("#,##0.##", CultureInfo.CurrentCulture)
            : absoluteAmount.ToString("N0", CultureInfo.CurrentCulture);
        var sign = amount < 0 ? "−" : string.Empty;

        if (unit is null or { Id: ObjectiveUnitCatalog.CustomId })
        {
            var customLabel = objective.CustomUnitLabel.Trim();
            if (customLabel.Length == 0)
                return $"{sign}{number}";

            return customLabel is "$" or "¥" or "€" or "£"
                ? $"{sign}{customLabel}{number}"
                : $"{sign}{number} {customLabel}";
        }

        return $"{sign}{unit.Prefix}{number}{unit.Suffix}";
    }
}
