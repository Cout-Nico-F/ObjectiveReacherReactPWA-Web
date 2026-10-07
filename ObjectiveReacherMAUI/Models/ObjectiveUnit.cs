namespace ObjectiveReacherMAUI.Models;

public sealed record ObjectiveUnit(string Id, string DisplayName, string Prefix, string Suffix);

public static class ObjectiveUnitCatalog
{
    public const string CustomId = "custom";

    public static IReadOnlyList<ObjectiveUnit> All { get; } =
    [
        new(CustomId, "Personalizada", string.Empty, string.Empty),
        new("MXN", "Peso mexicano (MXN)", "$", " MXN"),
        new("ARS", "Peso argentino (ARS)", "$", " ARS"),
        new("CLP", "Peso chileno (CLP)", "$", " CLP"),
        new("COP", "Peso colombiano (COP)", "$", " COP"),
        new("JPY", "Yen japonés (JPY)", "¥", " JPY"),
        new("USD", "Dólar estadounidense (USD)", "$", " USD"),
        new("EUR", "Euro (EUR)", "€", string.Empty),
        new("GBP", "Libra esterlina (GBP)", "£", string.Empty),
        new("CAD", "Dólar canadiense (CAD)", "$", " CAD")
    ];

    public static ObjectiveUnit? Find(string? id) => All.FirstOrDefault(unit => unit.Id == id);
}
