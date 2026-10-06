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

        public MainPage(DashboardViewModel viewModel)
        {
            InitializeComponent();
            _viewModel = viewModel;
            BindingContext = viewModel;
        }

        protected override async void OnAppearing()
        {
            base.OnAppearing();
            await _viewModel.InitializeAsync();
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
                return;

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

        private async void OnNavigationItemClicked(object? sender, EventArgs e) => await CloseDrawersAsync();

        private async void OnEditObjectiveClicked(object? sender, EventArgs e)
        {
            var input = await DisplayPromptAsync(
                "Editar objetivo",
                "Nuevo monto objetivo",
                initialValue: _viewModel.GoalAmount.ToString(CultureInfo.CurrentCulture),
                keyboard: Keyboard.Numeric);

            if (input is null)
                return;

            if (!await _viewModel.TrySetGoalAsync(input))
                await DisplayAlertAsync("Monto no válido", "Indica un objetivo mayor que cero.", "OK");
        }
    }
}