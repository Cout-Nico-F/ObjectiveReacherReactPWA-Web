using Microsoft.Maui.Storage;
using System.Globalization;
using ObjectiveReacherMAUI.ViewModels;

namespace ObjectiveReacherMAUI
{
    public partial class MainPage : ContentPage
    {
        private readonly DashboardViewModel _viewModel;
        private bool _isWideLayout;
        private bool _isNavigationOpen;
        private bool _isHistoryOpen;
        private double _lastWidth;
        private Border? _highlightedSection;
        private Brush? _originalSectionStroke;
        private double _originalSectionStrokeThickness;
        private int _sectionHighlightGeneration;
        private int _celebrationGeneration;
        private CancellationTokenSource? _celebrationCancellation;

        public MainPage(DashboardViewModel viewModel)
        {
            InitializeComponent();
            _viewModel = viewModel;
            BindingContext = viewModel;
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            _viewModel.CelebrationRequested -= OnCelebrationRequested;
            _viewModel.CelebrationRequested += OnCelebrationRequested;
            try
            {
                await _viewModel.InitializeAsync();
            }
            catch (Exception exception)
            {
                System.Diagnostics.Debug.WriteLine($"Dashboard initialization failed: {exception}");
                await DisplayAlertAsync("No se pudo cargar", "Ocurrió un error al cargar el panel. Inténtalo de nuevo.", "OK");
            }
        }

        protected override void OnDisappearing()
        {
            _viewModel.CelebrationRequested -= OnCelebrationRequested;
            CancelCelebration();
            _sectionHighlightGeneration++;
            if (_highlightedSection is not null)
            {
                _highlightedSection.CancelAnimations();
                _highlightedSection.Stroke = _originalSectionStroke ?? Colors.Transparent;
                _highlightedSection.StrokeThickness = _originalSectionStrokeThickness;
                _highlightedSection = null;
            }
            base.OnDisappearing();
        }

        private void OnCelebrationRequested(object? sender, DashboardCelebrationEventArgs e)
        {
            var generation = ++_celebrationGeneration;
            _celebrationCancellation?.Cancel();
            _celebrationCancellation?.Dispose();
            _celebrationCancellation = new CancellationTokenSource();
            var cancellationToken = _celebrationCancellation.Token;
            MainThread.BeginInvokeOnMainThread(async () =>
            {
                if (generation != _celebrationGeneration || cancellationToken.IsCancellationRequested)
                    return;

                try
                {
                    CelebrationEmoji.Text = e.Emoji;
                    CelebrationTitle.Text = e.Title;
                    CelebrationMessage.Text = e.Message;
                    CelebrationTitle.TextColor = Color.FromArgb(e.Color);
                    CelebrationCloseButton.IsVisible = e.RequiresDismissal;
                    CelebrationOverlay.IsVisible = true;
                    CelebrationOverlay.Opacity = 0;
                    CelebrationOverlay.Scale = 0.82;
                    await Task.WhenAll(
                        CelebrationOverlay.FadeToAsync(1, 220, Easing.CubicOut),
                        CelebrationOverlay.ScaleToAsync(1, 300, Easing.SpringOut));

                    if (e.RequiresDismissal)
                        return;

                    await Task.Delay(TimeSpan.FromSeconds(1.7), cancellationToken);
                    if (generation != _celebrationGeneration || cancellationToken.IsCancellationRequested)
                        return;

                    await Task.WhenAll(
                        CelebrationOverlay.FadeToAsync(0, 220, Easing.CubicIn),
                        CelebrationOverlay.ScaleToAsync(0.94, 220, Easing.CubicIn));
                    CelebrationOverlay.IsVisible = false;
                }
                catch (OperationCanceledException)
                {
                    // Navigation away or a newer celebration cancels this transient UI.
                }
            });
        }

        private void CancelCelebration()
        {
            _celebrationGeneration++;
            _celebrationCancellation?.Cancel();
            _celebrationCancellation?.Dispose();
            _celebrationCancellation = null;
            CelebrationOverlay.CancelAnimations();
            CelebrationOverlay.IsVisible = false;
            CelebrationOverlay.Opacity = 0;
            CelebrationOverlay.Scale = 0.82;
        }

        private async void OnCelebrationCloseClicked(object? sender, EventArgs e)
        {
            _celebrationCancellation?.Cancel();
            CelebrationOverlay.CancelAnimations();
            await Task.WhenAll(
                CelebrationOverlay.FadeToAsync(0, 180, Easing.CubicIn),
                CelebrationOverlay.ScaleToAsync(0.94, 180, Easing.CubicIn));
            CelebrationOverlay.IsVisible = false;
            CelebrationCloseButton.IsVisible = false;
        }

        protected override void OnSizeAllocated(double width, double height)
        {
            base.OnSizeAllocated(width, height);

            if (width <= 0 || Math.Abs(width - _lastWidth) < 1)
                return;

            _lastWidth = width;
            ConfigureLayout(width);
        }

        private void ConfigureLayout(double width)
        {
            _isWideLayout = width >= 900;
            DashboardGrid.ColumnDefinitions[0].Width = _isWideLayout ? new GridLength(220) : new GridLength(0);
            DashboardGrid.ColumnDefinitions[1].Width = GridLength.Star;
            DashboardGrid.ColumnDefinitions[2].Width = _isWideLayout ? new GridLength(320) : new GridLength(0);

            if (_isWideLayout)
            {
                _isNavigationOpen = false;
                _isHistoryOpen = false;
                DashboardContent.SetValue(Grid.ColumnProperty, 1);
                DashboardContent.SetValue(Grid.ColumnSpanProperty, 1);
                NavigationPanel.SetValue(Grid.ColumnProperty, 0);
                NavigationPanel.SetValue(Grid.ColumnSpanProperty, 1);
                NavigationPanel.WidthRequest = -1;
                NavigationPanel.HorizontalOptions = LayoutOptions.Fill;
                NavigationPanel.IsVisible = true;
                NavigationPanel.TranslationX = 0;
                HistoryPanel.SetValue(Grid.ColumnProperty, 2);
                HistoryPanel.SetValue(Grid.ColumnSpanProperty, 1);
                HistoryPanel.WidthRequest = -1;
                HistoryPanel.HorizontalOptions = LayoutOptions.Fill;
                HistoryPanel.IsVisible = true;
                HistoryPanel.TranslationX = 0;
                DrawerScrim.IsVisible = false;
                NavigationButton.IsVisible = false;
                HistoryButton.IsVisible = false;
                HistoryCloseButton.IsVisible = false;
            }
            else
            {
                DashboardContent.SetValue(Grid.ColumnProperty, 0);
                DashboardContent.SetValue(Grid.ColumnSpanProperty, 3);
                NavigationPanel.SetValue(Grid.ColumnProperty, 0);
                NavigationPanel.SetValue(Grid.ColumnSpanProperty, 3);
                NavigationPanel.WidthRequest = Math.Min(280, width - 40);
                NavigationPanel.HorizontalOptions = LayoutOptions.Start;
                NavigationPanel.IsVisible = _isNavigationOpen;
                NavigationPanel.TranslationX = _isNavigationOpen ? 0 : -NavigationPanel.WidthRequest;
                HistoryPanel.SetValue(Grid.ColumnProperty, 0);
                HistoryPanel.SetValue(Grid.ColumnSpanProperty, 3);
                HistoryPanel.WidthRequest = Math.Min(340, width - 40);
                HistoryPanel.HorizontalOptions = LayoutOptions.End;
                HistoryPanel.IsVisible = _isHistoryOpen;
                HistoryPanel.TranslationX = _isHistoryOpen ? 0 : HistoryPanel.WidthRequest;
                DrawerScrim.IsVisible = _isNavigationOpen || _isHistoryOpen;
                NavigationButton.IsVisible = true;
                HistoryButton.IsVisible = true;
                HistoryCloseButton.IsVisible = true;
            }
        }

        private async void OnNavigationClicked(object? sender, EventArgs e)
        {
            if (_isWideLayout)
                return;

            _isHistoryOpen = false;
            _isNavigationOpen = true;
            await ShowDrawerAsync(NavigationPanel, -NavigationPanel.WidthRequest, 0);
        }

        private async void OnHistoryClicked(object? sender, EventArgs e)
        {
            if (_isWideLayout)
            {
                await DashboardContent.ScrollToAsync(EntriesSection, ScrollToPosition.Start, true);
                return;
            }

            _isNavigationOpen = false;
            _isHistoryOpen = true;
            await ShowDrawerAsync(HistoryPanel, HistoryPanel.WidthRequest, 0);
        }

        private async Task ShowDrawerAsync(VisualElement drawer, double startX, double endX)
        {
            var otherDrawer = drawer == NavigationPanel ? HistoryPanel : NavigationPanel;
            otherDrawer.IsVisible = false;
            drawer.IsVisible = true;
            drawer.TranslationX = startX;
            DrawerScrim.Opacity = 0;
            DrawerScrim.IsVisible = true;
            await Task.WhenAll(
                drawer.TranslateToAsync(endX, 0, 180, Easing.CubicOut),
                DrawerScrim.FadeToAsync(1, 150, Easing.CubicOut));
        }

        private async void OnClosePanelsClicked(object? sender, EventArgs e) => await CloseDrawersAsync();

        private async void OnScrimTapped(object? sender, TappedEventArgs e) => await CloseDrawersAsync();

        private async Task CloseDrawersAsync()
        {
            if (_isWideLayout)
                return;

            _isNavigationOpen = false;
            _isHistoryOpen = false;
            var navigationX = -NavigationPanel.WidthRequest;
            var historyX = HistoryPanel.WidthRequest;
            await Task.WhenAll(
                NavigationPanel.TranslateToAsync(navigationX, 0, 150, Easing.CubicIn),
                HistoryPanel.TranslateToAsync(historyX, 0, 150, Easing.CubicIn),
                DrawerScrim.FadeToAsync(0, 150, Easing.CubicIn));
            NavigationPanel.IsVisible = false;
            HistoryPanel.IsVisible = false;
            DrawerScrim.IsVisible = false;
        }

        private async void OnNavigationItemClicked(object? sender, EventArgs e)
        {
            var destination = (sender as Button)?.CommandParameter?.ToString();
            if (destination == "history")
            {
                UpdateSelectedNavigation(destination);
                await CloseDrawersAsync();
                await OnHistoryClickedAsync();
                return;
            }

            var target = destination switch
            {
                "objective" => ObjectiveSection,
                "entries" => EntriesSection,
                "stats" => StatisticsSection,
                "achievements" => AchievementsSection,
                "settings" => SettingsSection,
                _ => null
            };

            if (!_isWideLayout)
                await CloseDrawersAsync();
            if (target is not null)
            {
                UpdateSelectedNavigation(destination);
                await DashboardContent.ScrollToAsync(target, ScrollToPosition.Start, true);
                await HighlightSectionAsync(target);
            }
        }

        private void UpdateSelectedNavigation(string? destination)
        {
            var navigationItems = new Dictionary<string, Button>
            {
                ["objective"] = ObjectiveNavigationItem,
                ["entries"] = EntriesNavigationItem,
                ["history"] = HistoryNavigationItem,
                ["stats"] = StatisticsNavigationItem,
                ["achievements"] = AchievementsNavigationItem,
                ["settings"] = SettingsNavigationItem
            };

            foreach (var (key, button) in navigationItems)
            {
                var isSelected = key == destination;
                button.BackgroundColor = Color.FromArgb(isSelected ? "#302747" : "#171723");
                button.TextColor = Color.FromArgb(isSelected ? "#E6D9FF" : "#E5E1ED");
            }
        }

        private async Task HighlightSectionAsync(Border section)
        {
            if (_highlightedSection is not null)
            {
                _highlightedSection.CancelAnimations();
                _highlightedSection.Stroke = _originalSectionStroke!;
                _highlightedSection.StrokeThickness = _originalSectionStrokeThickness;
            }

            _highlightedSection = section;
            _originalSectionStroke = section.Stroke;
            _originalSectionStrokeThickness = section.StrokeThickness;
            section.Stroke = new SolidColorBrush(Color.FromArgb("#C7A4FF"));
            section.StrokeThickness = 3;

            var generation = ++_sectionHighlightGeneration;
            await Task.Delay(TimeSpan.FromSeconds(1));
            if (generation != _sectionHighlightGeneration)
                return;

            section.Stroke = _originalSectionStroke!;
            section.StrokeThickness = _originalSectionStrokeThickness;
            _highlightedSection = null;
        }

        private async Task OnHistoryClickedAsync()
        {
            if (_isWideLayout)
            {
                await DashboardContent.ScrollToAsync(EntriesSection, ScrollToPosition.Start, true);
                return;
            }

            _isNavigationOpen = false;
            _isHistoryOpen = true;
            await ShowDrawerAsync(HistoryPanel, HistoryPanel.WidthRequest, 0);
        }

        private async void OnObjectiveTabClicked(object? sender, EventArgs e)
        {
            if ((sender as Button)?.CommandParameter is Guid id)
            {
                await _viewModel.SelectObjectiveAsync(id.ToString());
                UpdateSelectedNavigation("objective");
                await HighlightSectionAsync(ObjectiveSection);
            }
        }

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

        private async void OnAllAchievementsClicked(object? sender, EventArgs e)
        {
            await Navigation.PushModalAsync(new AchievementsPage(_viewModel));
        }

        private async void OnAddObjectiveClicked(object? sender, EventArgs e)
        {
            await _viewModel.AddObjectiveAsync();
            await EditObjectiveAsync();
        }

        private async void OnArchiveCurrentObjectiveClicked(object? sender, EventArgs e)
        {
            var objective = _viewModel.CurrentObjective;
            if (!await DisplayAlertAsync("Archivar objetivo", $"¿Archivar '{objective.Title}'? Podrás restaurarlo desde Archivados.", "Archivar", "Cancelar"))
                return;

            if (!await _viewModel.ArchiveObjectiveAsync(objective.Id, true))
                await DisplayAlertAsync("No se pudo archivar", "Debe quedar al menos un objetivo activo.", "OK");
        }

        private async void OnDeleteCurrentObjectiveClicked(object? sender, EventArgs e)
        {
            var objective = _viewModel.CurrentObjective;
            if (!await DisplayAlertAsync("Eliminar objetivo", $"¿Eliminar '{objective.Title}' y todas sus entradas? Esta acción no se puede deshacer.", "Eliminar", "Cancelar"))
                return;

            if (!await _viewModel.DeleteObjectiveAsync(objective.Id))
                await DisplayAlertAsync("No se pudo eliminar", "No se puede eliminar el único objetivo activo.", "OK");
        }

        private async void OnArchivedObjectivesClicked(object? sender, EventArgs e)
        {
            if (_viewModel.ArchivedObjectives.Count == 0)
            {
                await DisplayAlertAsync("Archivados", "No hay objetivos archivados.", "OK");
                return;
            }

            var titles = _viewModel.ArchivedObjectives.Select(objective => objective.Title).ToArray();
            var selected = await DisplayActionSheetAsync("Objetivos archivados", "Cerrar", null, titles);
            var objective = _viewModel.ArchivedObjectives.FirstOrDefault(item => item.Title == selected);
            if (objective is null)
                return;

            var action = await DisplayActionSheetAsync(objective.Title, "Cancelar", "Eliminar definitivamente", "Restaurar");
            if (action == "Restaurar")
                await _viewModel.ArchiveObjectiveAsync(objective.Id, false);
            else if (action == "Eliminar definitivamente" && await DisplayAlertAsync("Eliminar objetivo", $"¿Eliminar '{objective.Title}' y sus entradas?", "Eliminar", "Cancelar"))
                await _viewModel.DeleteObjectiveAsync(objective.Id);
        }

        private async void OnEntryActionsClicked(object? sender, EventArgs e)
        {
            if ((sender as Button)?.CommandParameter is not Guid entryId)
                return;

            var action = await DisplayActionSheetAsync("Entrada", "Cancelar", "Eliminar", "Editar");
            if (action == "Editar")
            {
                var row = _viewModel.HistoryEntries.FirstOrDefault(item => item.Id == entryId);
                if (row is null)
                    return;

                var description = await DisplayPromptAsync("Editar entrada", "Descripción", "Continuar", "Cancelar", row.Description, maxLength: 80);
                if (description is null)
                    return;
                var amount = await DisplayPromptAsync("Editar entrada", "Importe positivo (se conserva si fue suma/resta)", "Guardar", "Cancelar", Math.Abs(row.Amount).ToString(CultureInfo.CurrentCulture), keyboard: Keyboard.Numeric);
                if (amount is null)
                    return;

                if (!await _viewModel.EditEntryAsync(entryId, description, amount))
                    await DisplayAlertAsync("Importe no válido", "Escribe un importe mayor que cero.", "OK");
            }
            else if (action == "Eliminar" && await DisplayAlertAsync("Eliminar entrada", "¿Eliminar esta entrada del historial?", "Eliminar", "Cancelar"))
            {
                await _viewModel.DeleteEntryAsync(entryId);
            }
        }

        private async void OnChangeBannerClicked(object? sender, EventArgs e) =>
            await new BannerPickerPage(_viewModel).ShowAsync(this);

        private async void OnEditObjectiveClicked(object? sender, EventArgs e) => await EditObjectiveAsync();

        private async Task EditObjectiveAsync()
        {
            var page = new ObjectiveEditorPage(_viewModel.CurrentObjective);
            var input = await page.ShowAsync(this);
            if (input is null)
            {
                await _viewModel.CancelNewObjectiveAsync();
                return;
            }

            if (!await _viewModel.TryUpdateObjectiveAsync(
                    input.Title,
                    input.Description,
                    input.GoalAmount,
                    input.UnitId,
                    input.CustomUnitLabel))
            {
                await _viewModel.CancelNewObjectiveAsync();
                await DisplayAlertAsync("Datos no válidos", "Indica un monto objetivo mayor que cero.", "OK");
            }
        }
    }
}