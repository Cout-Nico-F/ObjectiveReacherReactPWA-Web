using ObjectiveReacherMAUI.ViewModels;

namespace ObjectiveReacherMAUI;

public partial class AchievementsPage : ContentPage
{
    public AchievementsPage(DashboardViewModel viewModel)
    {
        InitializeComponent();
        BindingContext = viewModel;
    }

    private async void OnCloseClicked(object? sender, EventArgs e) => await Navigation.PopModalAsync();

    private async void OnAchievementClicked(object? sender, EventArgs e)
    {
        if ((sender as Button)?.CommandParameter is not AchievementViewModel achievement)
            return;

        var title = achievement.IsSecret && !achievement.IsUnlocked
            ? "Logro oculto"
            : $"{achievement.Icon} {achievement.Title}";
        var detail = achievement.IsSecret && !achievement.IsUnlocked
            ? $"Pista: {achievement.Description}"
            : achievement.Description;
        var status = achievement.IsUnlocked
            ? achievement.StatusText
            : $"{achievement.StatusText} · Recompensa: {achievement.RewardXp} XP";

        await DisplayAlertAsync(title, $"{detail}\n\n{status}", "Entendido");
    }
}
