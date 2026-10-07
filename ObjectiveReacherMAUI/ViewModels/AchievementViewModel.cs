using Microsoft.Maui.Graphics;
using ObjectiveReacherMAUI.Models;

namespace ObjectiveReacherMAUI.ViewModels;

public sealed class AchievementViewModel(AchievementDefinition definition, bool isUnlocked)
{
    public string Id { get; } = definition.Id;

    public string Title { get; } = definition.IsSecret && !isUnlocked ? "Logro oculto" : definition.Title;

    public string Description { get; } = definition.Description;

    public string Icon { get; } = definition.IsSecret && !isUnlocked ? "❔" : definition.Icon;

    public int RewardXp { get; } = definition.RewardXp;

    public bool IsUnlocked { get; } = isUnlocked;

    public bool IsSecret { get; } = definition.IsSecret;

    public string AccessibilityText => IsSecret && !IsUnlocked
        ? $"Logro oculto. Pista: {Description}"
        : $"{Title}. {Description}. {StatusText}";

    public string StatusText => IsUnlocked ? $"Desbloqueado · +{RewardXp} XP" : "Por desbloquear";

    public Color CardBackground => Color.FromArgb(IsUnlocked ? "#202D2A" : "#232231");

    public Color TitleColor => Color.FromArgb(IsUnlocked ? "#82E59B" : "#A8A3B8");
}
