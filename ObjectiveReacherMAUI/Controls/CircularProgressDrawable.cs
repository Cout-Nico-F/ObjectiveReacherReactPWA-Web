using Microsoft.Maui.Graphics;

namespace ObjectiveReacherMAUI.Controls;

public sealed class CircularProgressDrawable : IDrawable
{
    public double Progress { get; set; }

    public void Draw(ICanvas canvas, RectF dirtyRect)
    {
        var size = Math.Min(dirtyRect.Width, dirtyRect.Height);
        var strokeWidth = Math.Max(3, size * 0.075f);
        var diameter = size - strokeWidth;
        var bounds = new RectF(
            dirtyRect.Center.X - diameter / 2,
            dirtyRect.Center.Y - diameter / 2,
            diameter,
            diameter);

        canvas.StrokeSize = strokeWidth;
        canvas.StrokeLineCap = LineCap.Round;
        canvas.StrokeColor = Color.FromArgb("#51436C");
        canvas.DrawEllipse(bounds);

        var progress = (float)Math.Clamp(Progress, 0, 1);
        if (progress <= 0)
            return;

        canvas.StrokeColor = Color.FromArgb("#E5B945");
        canvas.DrawArc(bounds, -90, -90 + progress * 360, false, false);
    }
}
