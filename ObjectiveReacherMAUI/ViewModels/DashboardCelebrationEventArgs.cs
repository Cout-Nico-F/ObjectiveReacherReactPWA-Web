namespace ObjectiveReacherMAUI.ViewModels;

public sealed class DashboardCelebrationEventArgs(string title, string message, string emoji, string color, bool requiresDismissal = false) : EventArgs
{
    public string Title { get; } = title;

    public string Message { get; } = message;

    public string Emoji { get; } = emoji;

    public string Color { get; } = color;

    public bool RequiresDismissal { get; } = requiresDismissal;
}
