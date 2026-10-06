namespace ObjectiveReacherMAUI.Models;

public sealed class DashboardState
{
    public int Version { get; set; } = 1;

    public Objective Objective { get; set; } = new();

    public List<ObjectiveEntry> Entries { get; set; } = [];
}
