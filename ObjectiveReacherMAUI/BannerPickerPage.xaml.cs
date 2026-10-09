using Microsoft.Maui.Storage;
using ObjectiveReacherMAUI.Controls;
using ObjectiveReacherMAUI.ViewModels;

namespace ObjectiveReacherMAUI;

public sealed class BannerPickerPage : ContentPage
{
    private readonly DashboardViewModel _viewModel;
    private readonly TaskCompletionSource<bool> _completion = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly Grid _presetGrid = new() { ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Star) }, ColumnSpacing = 12, RowSpacing = 12 };
    private readonly CroppedBannerImage _photoPreview = new() { InputTransparent = true };
    private readonly Label _previewHint = new() { Text = "Selecciona una foto para encuadrarla aquí\narrastra para moverla", HorizontalTextAlignment = TextAlignment.Center, VerticalTextAlignment = TextAlignment.Center, TextColor = Color.FromArgb("#E7E1F0"), FontSize = 13, InputTransparent = true };
    private readonly List<BannerPreset> _presets =
    [
        new("gradient", "Degradado", "#33294E", "#211D35", "✦", null),
        new("japan", "Japón", "#392657", "#B9576A", "⛩", "banner_japan.png"),
        new("sunset", "Atardecer", "#45245F", "#F2A56D", "☀", "banner_sunset.png"),
        new("forest", "Bosque", "#152B3A", "#55776B", "♧", "banner_forest.png")
    ];
    private string? _photoPath;
    private double _panX;
    private double _panY;
    private double _startX;
    private double _startY;

    public BannerPickerPage(DashboardViewModel viewModel)
    {
        _viewModel = viewModel;
        Title = "Fondos del objetivo";
        BackgroundColor = Color.FromArgb("#11111B");
        Shell.SetNavBarIsVisible(this, false);
        Content = BuildContent();
        BuildPresetTiles();
    }

    private View BuildContent()
    {
        var header = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Auto), new ColumnDefinition(GridLength.Star) }, ColumnSpacing = 12 };
        var backButton = new Button { Text = "‹", WidthRequest = 42, HeightRequest = 42, Padding = 0, FontSize = 26, BackgroundColor = Color.FromArgb("#242238"), TextColor = Colors.White, CornerRadius = 12 };
        backButton.Clicked += OnCancelClicked;
        header.Add(backButton);
        var title = new VerticalStackLayout { Spacing = 2, VerticalOptions = LayoutOptions.Center };
        title.Add(new Label { Text = "Fondo del objetivo", FontSize = 20, FontAttributes = FontAttributes.Bold, TextColor = Color.FromArgb("#F5F2FA") });
        title.Add(new Label { Text = "Elige un diseño o una foto propia", FontSize = 12, TextColor = Color.FromArgb("#AAA5BB") });
        header.Add(title, 1);

        // Keep preview dimensions aligned with dashboard banner framing.
        var previewGrid = new Grid { HeightRequest = 370, InputTransparent = false, IsClippedToBounds = true };
        previewGrid.BackgroundColor = Colors.Transparent;
        previewGrid.Add(_photoPreview);
        _photoPreview.IsVisible = false;
        _previewHint.IsVisible = true;
        var pan = new PanGestureRecognizer();
        pan.PanUpdated += OnPreviewPanUpdated;
        previewGrid.GestureRecognizers.Add(pan);
        var preview = new Border
        {
            Padding = 0,
            HeightRequest = 370,
            Stroke = Color.FromArgb("#51436C"),
            StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = 18 },
            BackgroundColor = Colors.Transparent,
            Content = previewGrid
        };
        var body = new VerticalStackLayout { Spacing = 14 };
        body.Add(SectionLabel("DISEÑOS"));
        body.Add(_presetGrid);
        body.Add(SectionLabel("TU FOTO"));
        body.Add(preview);
        body.Add(_previewHint);
        body.Add(new Label { Text = "La imagen se recorta al marco; arrástrala para mostrar la parte que quieras.", FontSize = 11, TextColor = Color.FromArgb("#AAA5BB") });
        var choosePhoto = new Button { Text = "Elegir foto de la galería…", HeightRequest = 48, BackgroundColor = Color.FromArgb("#302747"), TextColor = Color.FromArgb("#F5F2FA"), CornerRadius = 12 };
        choosePhoto.Clicked += OnChoosePhotoForPreviewClicked;
        body.Add(choosePhoto);

        var footer = new Grid { ColumnDefinitions = { new ColumnDefinition(GridLength.Star), new ColumnDefinition(GridLength.Star) }, ColumnSpacing = 10 };
        var cancel = new Button { Text = "Cancelar", BackgroundColor = Color.FromArgb("#302747"), TextColor = Colors.White, CornerRadius = 12 };
        cancel.Clicked += OnCancelClicked;
        var apply = new Button { Text = "Aplicar foto", BackgroundColor = Color.FromArgb("#604094"), TextColor = Colors.White, CornerRadius = 12 };
        apply.Clicked += OnApplyPhotoClicked;
        footer.Add(cancel);
        footer.Add(apply, 1);

        var layout = new Grid { RowDefinitions = { new RowDefinition(GridLength.Auto), new RowDefinition(GridLength.Star), new RowDefinition(GridLength.Auto) }, RowSpacing = 16, Padding = 18 };
        layout.Add(header);
        layout.Add(new ScrollView { Content = body }, 0, 1);
        layout.Add(footer, 0, 2);
        return layout;
    }

    private static Label SectionLabel(string text) => new()
    {
        Text = text,
        FontSize = 11,
        FontAttributes = FontAttributes.Bold,
        TextColor = Color.FromArgb("#AAA5BB")
    };

    private async void OnChoosePhotoForPreviewClicked(object? sender, EventArgs e)
    {
        try
        {
            var result = await FilePicker.Default.PickAsync(new PickOptions
            {
                PickerTitle = "Selecciona una foto para el banner",
                FileTypes = FilePickerFileType.Images
            });

            if (result is null)
                return;

            var bannerDirectory = Path.Combine(FileSystem.AppDataDirectory, "banners");
            Directory.CreateDirectory(bannerDirectory);

            var extension = Path.GetExtension(result.FileName);
            if (string.IsNullOrWhiteSpace(extension))
                extension = ".img";

            var destinationPath = Path.Combine(bannerDirectory, $"{Guid.NewGuid():N}{extension}");
            await using (var source = await result.OpenReadAsync())
            await using (var destination = File.Create(destinationPath))
                await source.CopyToAsync(destination);

            _photoPath = destinationPath;
            _panX = _panY = _startX = _startY = 0;

            if (!BannerImageDimensions.TryRead(destinationPath, out _, out _))
            {
                _photoPath = null;
                await DisplayAlertAsync("Imagen no compatible", "No se pudo leer el tamaño de esta foto. Prueba con una imagen JPG, PNG, WebP, BMP o GIF.", "Aceptar");
                return;
            }

            await MainThread.InvokeOnMainThreadAsync(() =>
            {
                _photoPreview.Source = null;
                _photoPreview.OffsetX = 0;
                _photoPreview.OffsetY = 0;
                _photoPreview.Source = ImageSource.FromFile(destinationPath);
                _photoPreview.IsVisible = true;
                _previewHint.IsVisible = false;
                _photoPreview.InvalidateMeasure();
            });
        }
        catch (Exception ex)
        {
            await DisplayAlertAsync("No se pudo cargar la imagen", ex.Message, "Aceptar");
        }
    }

    public async Task ShowAsync(Page parent)
    {
        await parent.Navigation.PushModalAsync(this);
        await _completion.Task;
    }

    private void BuildPresetTiles()
    {
        for (var i = 0; i < _presets.Count; i++)
        {
            var preset = _presets[i];
            var tile = new Border
            {
                HeightRequest = 102,
                Padding = 0,
                Stroke = Color.FromArgb("#51436C"),
                StrokeThickness = 1,
                StrokeShape = new Microsoft.Maui.Controls.Shapes.RoundRectangle { CornerRadius = 16 },
                Background = new LinearGradientBrush(
                    new GradientStopCollection
                    {
                        new(Color.FromArgb(preset.StartColor), 0),
                        new(Color.FromArgb(preset.EndColor), 1)
                    },
                    new Point(0, 0),
                    new Point(1, 1)),
                Content = new Grid
                {
                    Children =
                    {
                        new Label { Text = preset.Emoji, FontSize = 32, HorizontalOptions = LayoutOptions.Center, VerticalOptions = LayoutOptions.Center, TextColor = Colors.White },
                        new Label { Text = preset.Name, FontSize = 12, FontAttributes = FontAttributes.Bold, HorizontalOptions = LayoutOptions.Start, VerticalOptions = LayoutOptions.End, Margin = new Thickness(12, 0, 0, 10), TextColor = Colors.White }
                    }
                }
            };

            if (preset.ImageName is not null)
                ((Grid)tile.Content).Children.Insert(0, new Image { Source = preset.ImageName, Aspect = Aspect.AspectFill, Opacity = 0.62, InputTransparent = true });

            var button = new Button { BackgroundColor = Colors.Transparent, Text = string.Empty, CommandParameter = preset.Id };
            button.Clicked += OnPresetClicked;
            ((Grid)tile.Content).Children.Add(button);
            _presetGrid.Add(tile, i % 2, i / 2);
        }
    }

    private async void OnPresetClicked(object? sender, EventArgs e)
    {
        if ((sender as Button)?.CommandParameter is not string bannerId)
            return;

        if (await _viewModel.TrySetBannerAsync(bannerId))
            await CloseAsync(true);
        else
            await DisplayAlertAsync("No se pudo aplicar", "No se pudo guardar el fondo seleccionado.", "OK");
    }

    private void OnPreviewPanUpdated(object? sender, PanUpdatedEventArgs e)
    {
        if (_photoPath is null)
            return;

        if (e.StatusType == GestureStatus.Started)
        {
            _startX = _panX;
            _startY = _panY;
        }
        else if (e.StatusType == GestureStatus.Running)
        {
            var maxOffsetX = Math.Max(1, _photoPreview.MaxPanX);
            var maxOffsetY = Math.Max(1, _photoPreview.MaxPanY);
            _panX = Math.Clamp(_startX + e.TotalX / maxOffsetX, -1, 1);
            _panY = Math.Clamp(_startY + e.TotalY / maxOffsetY, -1, 1);
            _photoPreview.OffsetX = _panX;
            _photoPreview.OffsetY = _panY;
        }
    }

    private async void OnApplyPhotoClicked(object? sender, EventArgs e)
    {
        if (_photoPath is null)
        {
            await DisplayAlertAsync("Elige una foto", "Selecciona primero una imagen de la galería.", "OK");
            return;
        }

        var relativePath = System.IO.Path.GetRelativePath(FileSystem.AppDataDirectory, _photoPath).Replace('\\', '/');
        if (!await _viewModel.TrySetBannerAsync($"custom:{relativePath}", _panX, _panY))
        {
            await DisplayAlertAsync("No se pudo guardar", "No se pudo aplicar la imagen seleccionada.", "OK");
            return;
        }

        await CloseAsync(true);
    }

    private async void OnCancelClicked(object? sender, EventArgs e) => await CloseAsync(false);

    private async Task CloseAsync(bool applied)
    {
        if (_completion.TrySetResult(applied))
            await Navigation.PopModalAsync();
    }

    private sealed record BannerPreset(string Id, string Name, string StartColor, string EndColor, string Emoji, string? ImageName);
}
