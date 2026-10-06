namespace ObjectiveReacherMAUI.Models;

public sealed class Objective
{
    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public decimal GoalAmount { get; set; }

    public decimal CurrentAmount { get; set; }
}
