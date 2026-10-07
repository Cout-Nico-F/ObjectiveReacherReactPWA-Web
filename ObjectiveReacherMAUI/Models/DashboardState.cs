namespace ObjectiveReacherMAUI.Models;

public sealed class DashboardState
{
    public int Version { get; set; } = 5;

    public List<Objective> Objectives { get; set; } = [];

    public Guid SelectedObjectiveId { get; set; }

    public GamificationState Gamification { get; set; } = new();
}
