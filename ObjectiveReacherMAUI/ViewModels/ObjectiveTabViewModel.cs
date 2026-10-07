using Microsoft.Maui.Graphics;

namespace ObjectiveReacherMAUI.ViewModels;

public sealed class ObjectiveTabViewModel(Guid id, string title, bool isSelected)
{
    public Guid Id { get; } = id;

    public string Title { get; } = title;

    public bool IsSelected { get; } = isSelected;

    public Color BackgroundColor => Color.FromArgb(IsSelected ? "#604094" : "#252437");

    public Color TextColor => Color.FromArgb(IsSelected ? "#FFFFFF" : "#C9C2D8");
}
