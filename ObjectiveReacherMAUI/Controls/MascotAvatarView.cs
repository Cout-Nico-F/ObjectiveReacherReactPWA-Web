namespace ObjectiveReacherMAUI.Controls;

public sealed class MascotAvatarView : GraphicsView
{
    public static readonly BindableProperty LevelProperty = BindableProperty.Create(
        nameof(Level),
        typeof(int),
        typeof(MascotAvatarView),
        1,
        propertyChanged: OnPropertyInvalidated);

    public static readonly BindableProperty IsLockedProperty = BindableProperty.Create(
        nameof(IsLocked),
        typeof(bool),
        typeof(MascotAvatarView),
        false,
        propertyChanged: OnPropertyInvalidated);

    private readonly MascotAvatarDrawable _drawable = new();

    public MascotAvatarView()
    {
        Drawable = _drawable;
    }

    public int Level
    {
        get => (int)GetValue(LevelProperty);
        set => SetValue(LevelProperty, value);
    }

    public bool IsLocked
    {
        get => (bool)GetValue(IsLockedProperty);
        set => SetValue(IsLockedProperty, value);
    }

    private static void OnPropertyInvalidated(BindableObject bindable, object oldValue, object newValue)
    {
        var view = (MascotAvatarView)bindable;
        view._drawable.Level = view.Level;
        view._drawable.IsLocked = view.IsLocked;
        view.Invalidate();
    }
}
