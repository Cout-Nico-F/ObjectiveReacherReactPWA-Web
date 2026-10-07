using Microsoft.Maui.Graphics;

namespace ObjectiveReacherMAUI.Controls;

public sealed class CircularProgressView : GraphicsView
{
    public static readonly BindableProperty ProgressProperty = BindableProperty.Create(
        nameof(Progress),
        typeof(double),
        typeof(CircularProgressView),
        0d,
        propertyChanged: OnProgressChanged);

    public CircularProgressView()
    {
        Drawable = new CircularProgressDrawable();
    }

    public double Progress
    {
        get => (double)GetValue(ProgressProperty);
        set => SetValue(ProgressProperty, value);
    }

    private static void OnProgressChanged(BindableObject bindable, object oldValue, object newValue)
    {
        var view = (CircularProgressView)bindable;
        ((CircularProgressDrawable)view.Drawable!).Progress = (double)newValue;
        view.Invalidate();
    }
}
