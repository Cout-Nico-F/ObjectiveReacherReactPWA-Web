namespace ObjectiveReacherMAUI.Models;

public sealed class Objective
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public decimal GoalAmount { get; set; }

    public decimal CurrentAmount { get; set; }

    public string UnitId { get; set; } = ObjectiveUnitCatalog.CustomId;

    public string CustomUnitLabel { get; set; } = "$";

    public string BannerId { get; set; } = "gradient";

    public double BannerOffsetX { get; set; }

    public double BannerOffsetY { get; set; }

    public bool IsArchived { get; set; }

    public List<ObjectiveEntry> Entries { get; set; } = [];

    public List<string> UnlockedAchievementIds { get; set; } = [];
}
