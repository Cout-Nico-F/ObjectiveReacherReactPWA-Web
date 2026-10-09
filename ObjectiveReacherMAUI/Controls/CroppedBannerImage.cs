using Microsoft.Maui.Storage;

namespace ObjectiveReacherMAUI.Controls;

public sealed class CroppedBannerImage : Image
{
    public static readonly BindableProperty OffsetXProperty = BindableProperty.Create(
        nameof(OffsetX), typeof(double), typeof(CroppedBannerImage), 0d, propertyChanged: OnCropChanged);

    public static readonly BindableProperty OffsetYProperty = BindableProperty.Create(
        nameof(OffsetY), typeof(double), typeof(CroppedBannerImage), 0d, propertyChanged: OnCropChanged);

    public static readonly BindableProperty SourcePixelWidthProperty = BindableProperty.Create(
        nameof(SourcePixelWidth), typeof(double), typeof(CroppedBannerImage), 0d, propertyChanged: OnCropChanged);

    public static readonly BindableProperty SourcePixelHeightProperty = BindableProperty.Create(
        nameof(SourcePixelHeight), typeof(double), typeof(CroppedBannerImage), 0d, propertyChanged: OnCropChanged);

    private VisualElement? _viewport;

    public CroppedBannerImage()
    {
        Aspect = Aspect.Fill;
        PropertyChanged += (_, args) =>
        {
            if (args.PropertyName == nameof(Source))
            {
                UpdateSourceDimensions();
                UpdateCrop();
            }
        };
    }

    public double OffsetX
    {
        get => (double)GetValue(OffsetXProperty);
        set => SetValue(OffsetXProperty, value);
    }

    public double OffsetY
    {
        get => (double)GetValue(OffsetYProperty);
        set => SetValue(OffsetYProperty, value);
    }

    public double SourcePixelWidth
    {
        get => (double)GetValue(SourcePixelWidthProperty);
        set => SetValue(SourcePixelWidthProperty, value);
    }

    public double SourcePixelHeight
    {
        get => (double)GetValue(SourcePixelHeightProperty);
        set => SetValue(SourcePixelHeightProperty, value);
    }

    public double MaxPanX => CalculateMaxPan().X;

    public double MaxPanY => CalculateMaxPan().Y;

    protected override void OnParentSet()
    {
        base.OnParentSet();

        if (_viewport is not null)
            _viewport.SizeChanged -= OnViewportSizeChanged;

        _viewport = Parent as VisualElement;

        if (_viewport is not null)
            _viewport.SizeChanged += OnViewportSizeChanged;

        UpdateCrop();
    }

    private void OnViewportSizeChanged(object? sender, EventArgs e) => UpdateCrop();

    private static void OnCropChanged(BindableObject bindable, object oldValue, object newValue) =>
        ((CroppedBannerImage)bindable).UpdateCrop();

    private void UpdateSourceDimensions()
    {
        SetValue(SourcePixelWidthProperty, 0d);
        SetValue(SourcePixelHeightProperty, 0d);

        if (Source is FileImageSource fileSource && !string.IsNullOrWhiteSpace(fileSource.File))
        {
            var path = fileSource.File;
            if (!Path.IsPathRooted(path))
                path = Path.Combine(FileSystem.AppDataDirectory, path);

            if (BannerImageDimensions.TryRead(path, out var width, out var height))
            {
                SetValue(SourcePixelWidthProperty, width);
                SetValue(SourcePixelHeightProperty, height);
            }
        }
    }

    private void UpdateCrop()
    {
        var viewportWidth = _viewport?.Width ?? 0;
        var viewportHeight = _viewport?.Height ?? 0;

        if (!HasCropData(viewportWidth, viewportHeight))
        {
            WidthRequest = -1;
            HeightRequest = -1;
            HorizontalOptions = LayoutOptions.Fill;
            VerticalOptions = LayoutOptions.Fill;
            TranslationX = 0;
            TranslationY = 0;
            return;
        }

        var (renderedWidth, renderedHeight) = CalculateCoverSize(viewportWidth, viewportHeight);
        WidthRequest = renderedWidth;
        HeightRequest = renderedHeight;
        HorizontalOptions = LayoutOptions.Center;
        VerticalOptions = LayoutOptions.Center;

        var maxPan = CalculateMaxPan();
        TranslationX = Math.Clamp(OffsetX, -1d, 1d) * maxPan.X;
        TranslationY = Math.Clamp(OffsetY, -1d, 1d) * maxPan.Y;
    }

    private (double X, double Y) CalculateMaxPan()
    {
        var viewportWidth = _viewport?.Width ?? 0;
        var viewportHeight = _viewport?.Height ?? 0;

        if (!HasCropData(viewportWidth, viewportHeight))
            return (0, 0);

        var (renderedWidth, renderedHeight) = CalculateCoverSize(viewportWidth, viewportHeight);
        return (
            Math.Max(0, (renderedWidth - viewportWidth) / 2),
            Math.Max(0, (renderedHeight - viewportHeight) / 2));
    }

    private bool HasCropData(double viewportWidth, double viewportHeight) =>
        viewportWidth > 0 && viewportHeight > 0 && SourcePixelWidth > 0 && SourcePixelHeight > 0;

    private (double Width, double Height) CalculateCoverSize(double viewportWidth, double viewportHeight)
    {
        var fillScale = Math.Max(viewportWidth / SourcePixelWidth, viewportHeight / SourcePixelHeight);
        return (SourcePixelWidth * fillScale, SourcePixelHeight * fillScale);
    }
}
