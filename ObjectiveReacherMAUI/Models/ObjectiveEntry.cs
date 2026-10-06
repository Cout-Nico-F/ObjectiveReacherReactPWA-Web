namespace ObjectiveReacherMAUI.Models;

public sealed class ObjectiveEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Description { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.Now;
}
