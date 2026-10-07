using ObjectiveReacherMAUI.Models;
using System.Globalization;

namespace ObjectiveReacherMAUI;

public sealed record ObjectiveEditInput(string Title, string Description, string GoalAmount, string UnitId, string CustomUnitLabel);

public partial class ObjectiveEditorPage : ContentPage
{
    private readonly TaskCompletionSource<ObjectiveEditInput?> _completion = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public ObjectiveEditorPage(Objective objective)
    {
        InitializeComponent();
        TitleEntry.Text = objective.Title;
        DescriptionEntry.Text = objective.Description;
        GoalAmountEntry.Text = objective.GoalAmount.ToString(CultureInfo.CurrentCulture);
        UnitPicker.ItemsSource = ObjectiveUnitCatalog.All.ToList();
        UnitPicker.ItemDisplayBinding = new Binding(nameof(ObjectiveUnit.DisplayName));
        UnitPicker.SelectedItem = ObjectiveUnitCatalog.Find(objective.UnitId) ?? ObjectiveUnitCatalog.All[0];
        CustomUnitEntry.Text = objective.CustomUnitLabel;
        GoalAmountEntry.TextChanged += OnGoalAmountTextChanged;
        UpdateCustomUnitVisibility();
    }

    public async Task<ObjectiveEditInput?> ShowAsync(Page owner)
    {
        await owner.Navigation.PushModalAsync(this);
        return await _completion.Task;
    }

    private void OnUnitSelectionChanged(object? sender, EventArgs e) => UpdateCustomUnitVisibility();

    private void OnGoalAmountTextChanged(object? sender, TextChangedEventArgs e)
    {
        if (string.IsNullOrWhiteSpace(e.NewTextValue) ||
            decimal.TryParse(e.NewTextValue, NumberStyles.Number, CultureInfo.CurrentCulture, out _) ||
            decimal.TryParse(e.NewTextValue, NumberStyles.Number, CultureInfo.InvariantCulture, out _))
        {
            GoalAmountEntry.TextColor = Application.Current?.Resources.TryGetValue("DashboardText", out var color) == true && color is Color dashboardText
                ? dashboardText
                : Colors.Black;
            return;
        }

        GoalAmountEntry.TextColor = Colors.OrangeRed;
    }

    private void UpdateCustomUnitVisibility() =>
        CustomUnitContainer.IsVisible = (UnitPicker.SelectedItem as ObjectiveUnit)?.Id == ObjectiveUnitCatalog.CustomId;

    private async void OnSaveClicked(object? sender, EventArgs e)
    {
        if (string.IsNullOrWhiteSpace(TitleEntry.Text) || UnitPicker.SelectedItem is not ObjectiveUnit selectedUnit)
        {
            await DisplayAlertAsync("Revisa los datos", "Escribe un nombre y selecciona una unidad.", "OK");
            return;
        }

        if (!decimal.TryParse(GoalAmountEntry.Text, NumberStyles.Number, CultureInfo.CurrentCulture, out var amount) &&
            !decimal.TryParse(GoalAmountEntry.Text, NumberStyles.Number, CultureInfo.InvariantCulture, out amount) || amount <= 0)
        {
            await DisplayAlertAsync("Monto no válido", "El monto objetivo debe ser un número mayor que cero.", "OK");
            GoalAmountEntry.Focus();
            return;
        }

        var customUnit = selectedUnit.Id == ObjectiveUnitCatalog.CustomId ? CustomUnitEntry.Text?.Trim() ?? string.Empty : string.Empty;
        if (selectedUnit.Id == ObjectiveUnitCatalog.CustomId && string.IsNullOrWhiteSpace(customUnit))
        {
            await DisplayAlertAsync("Falta la unidad", "Escribe una unidad como kg, libros o pasos.", "OK");
            return;
        }

        _completion.TrySetResult(new ObjectiveEditInput(
            TitleEntry.Text.Trim(),
            DescriptionEntry.Text?.Trim() ?? string.Empty,
            amount.ToString(CultureInfo.InvariantCulture),
            selectedUnit.Id,
            customUnit));
        await Navigation.PopModalAsync();
    }

    private async void OnCancelClicked(object? sender, EventArgs e)
    {
        _completion.TrySetResult(null);
        await Navigation.PopModalAsync();
    }

    protected override void OnDisappearing()
    {
        base.OnDisappearing();
        _completion.TrySetResult(null);
    }
}
