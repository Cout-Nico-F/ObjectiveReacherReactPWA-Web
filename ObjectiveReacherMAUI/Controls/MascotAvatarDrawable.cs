using Microsoft.Maui.Graphics;

namespace ObjectiveReacherMAUI.Controls;

public sealed class MascotAvatarDrawable : IDrawable
{
    public int Level { get; set; } = 1;

    public bool IsLocked { get; set; }

    private static readonly (string Primary, string Secondary, string Accent, string Glow)[] TierPalettes =
    [
        ("#2E7D5B", "#65DB85", "#BFF5CE", "#1E4635"), // 0: Brote Esmeralda (1-10)
        ("#3B5BA5", "#7DA6FF", "#D6E4FF", "#203059"), // 1: Espíritu Neko (11-20)
        ("#B84A39", "#FF8A65", "#FFE0B2", "#4E221B"), // 2: Zorro Kitsune (21-30)
        ("#5D4037", "#BCAAA4", "#FFE082", "#32231E"), // 3: Búho Sabio (31-40)
        ("#28667E", "#64D8FF", "#E0F7FA", "#163745"), // 4: Lobo Boreal (41-50)
        ("#C66900", "#FFB74D", "#FFF3E0", "#4D2C08"), // 5: Tigre Guardián (51-60)
        ("#C79100", "#FFD54F", "#FFFDE7", "#4F3B05"), // 6: León Solar (61-70)
        ("#2E6B4E", "#81C784", "#E8F5E9", "#193A2A"), // 7: Ciervo del Bosque (71-80)
        ("#C62828", "#FF7043", "#FFD54F", "#4F1010"), // 8: Fénix Carmesí (81-90)
        ("#455A64", "#80CBC4", "#A7FFEB", "#1C262B"), // 9: Gólem Rúnico de Cristal (91-100)
        ("#00695C", "#26A69A", "#64FFDA", "#042F2B"), // 10: Kraken Abisal (101-110)
        ("#8D6E63", "#FFD54F", "#FFF8E1", "#3E2723"), // 11: Cronos Autómata (111-120)
        ("#6A1B9A", "#CE93D8", "#FFD54F", "#330D4B"), // 12: Dragón Imperial Ryu (121-130)
        ("#283593", "#7986CB", "#F8BBD0", "#141A46"), // 13: Polilla Astral (131-140)
        ("#AD8700", "#FFE082", "#FFFFFF", "#4A3A00"), // 14: Serafín Ophanim (141-150)
        ("#2E7D32", "#66BB6A", "#DCE775", "#153817"), // 15: Hidra Tricéfala (151-160)
        ("#4A148C", "#B388FF", "#FF80AB", "#240846"), // 16: Djinn Astral (161-170)
        ("#1565C0", "#90CAF9", "#FFD740", "#0B2948"), // 17: Valkiria Celestial (171-180)
        ("#00838F", "#4DD0E1", "#E040FB", "#052C33"), // 18: Arquitecto Merkaba (181-190)
        ("#311B92", "#E040FB", "#FFD740", "#120836")  // 19: Singularidad Cósmica (191-200+)
    ];

    public void Draw(ICanvas canvas, RectF dirtyRect)
    {
        var size = Math.Min(dirtyRect.Width, dirtyRect.Height);
        if (size <= 4)
            return;

        canvas.SaveState();

        var clampedLevel = Math.Clamp(Level, 1, 200);
        var tier = (clampedLevel - 1) / 10;       // 0..19
        var subLevel = (clampedLevel - 1) % 10;   // 0..9
        var subProgress = subLevel / 9f;

        var palette = TierPalettes[Math.Clamp(tier, 0, TierPalettes.Length - 1)];
        var realPrimary = Color.FromArgb(palette.Primary);
        var realAccent = Color.FromArgb(palette.Accent);

        // Si está bloqueado, usamos los tonos de silueta con destello tenue del color de su etapa
        var primaryColor = IsLocked ? Color.FromArgb("#232136") : realPrimary;
        var secondaryColor = IsLocked ? Color.FromArgb("#181726") : Color.FromArgb(palette.Secondary);
        var accentColor = IsLocked ? realPrimary.WithAlpha(0.55f) : realAccent;
        var glowColor = IsLocked ? Color.FromArgb("#0E0E17") : Color.FromArgb(palette.Glow);

        var cx = dirtyRect.Center.X;
        var cy = dirtyRect.Center.Y;
        var radius = size * 0.46f;

        // 1. Medallón base
        canvas.FillColor = glowColor;
        canvas.FillCircle(cx, cy, radius);

        canvas.StrokeColor = IsLocked ? realPrimary.WithAlpha(0.35f) : primaryColor.WithAlpha(0.6f + subProgress * 0.35f);
        canvas.StrokeSize = Math.Max(1.5f, size * (0.035f + subProgress * 0.02f));
        canvas.DrawCircle(cx, cy, radius * 0.92f);

        // 1b. Capas evolutivas de fondo según subnivel (Halo rúnico circular limpio en Tier 0, rayos y cristales en etapas superiores)
        DrawSubLevelAura(canvas, cx, cy, radius, size, tier, subLevel, primaryColor, secondaryColor, accentColor, IsLocked);

        // 2. Partículas orbitales (1 a 10 según subnivel)
        var starCount = subLevel + 1;
        var orbitRadius = radius * 0.82f;
        canvas.FillColor = IsLocked ? realPrimary.WithAlpha(0.3f) : accentColor.WithAlpha(0.85f);
        for (var i = 0; i < starCount; i++)
        {
            var angle = -MathF.PI / 2f + i * (MathF.PI * 2f / Math.Max(3, starCount));
            var sx = cx + MathF.Cos(angle) * orbitRadius;
            var sy = cy + MathF.Sin(angle) * orbitRadius;
            var starRadius = size * (0.02f + (i % 2) * 0.008f + subProgress * 0.006f);
            canvas.FillCircle(sx, sy, starRadius);
        }

        var creatureScale = 0.72f + subProgress * 0.26f;
        var u = radius * creatureScale;

        // 3. Dibujar la criatura única de cada una de las 20 etapas (con evolución anatómica por subnivel)
        DrawTierCreature(canvas, cx, cy, u, tier, subLevel, primaryColor, secondaryColor, accentColor, IsLocked);

        // 3b. Insignias evolutivas superiores según subnivel (gema frontal, diadema real en subniveles altos; Tier 0 usa su propia flor de loto)
        if (tier > 0)
            DrawSubLevelCrown(canvas, cx, cy, u, subLevel, primaryColor, accentColor, IsLocked);

        // 4. Si está bloqueado, cruzar la barra sólida inclinada de borde a borde del círculo con opacidad 90% y zigzag a 2/3
        if (IsLocked)
        {
            canvas.SaveState();
            canvas.Rotate(-26f, cx, cy);

            // El círculo interior que la contiene tiene diámetro = radius * 0.92f * 2 = radius * 1.84f
            var barWidth = radius * 1.84f;
            var barHeight = radius * 0.32f;
            var barX = cx - barWidth / 2f;
            var barY = cy - barHeight / 2f;
            var corner = barHeight * 0.24f;

            // Sombra de la barra inclinada
            canvas.FillColor = Color.FromArgb("#99050509");
            canvas.FillRoundedRectangle(barX, barY + size * 0.014f, barWidth, barHeight, corner);

            // Fondo sólido de la barra inclinada al 90% de opacidad
            canvas.FillColor = Color.FromArgb("#231F36").WithAlpha(0.90f);
            canvas.FillRoundedRectangle(barX, barY, barWidth, barHeight, corner);

            // Borde de la barra con destello de la etapa
            canvas.StrokeColor = realPrimary.WithAlpha(0.65f);
            canvas.StrokeSize = Math.Max(0.9f, size * 0.015f);
            canvas.DrawRoundedRectangle(barX, barY, barWidth, barHeight, corner);

            // Línea zigzag decorativa escalada a 2/3 a lo largo de la barra
            var zigMargin = barWidth * 0.08f;
            var zigStartX = barX + zigMargin;
            var zigSpan = barWidth - zigMargin * 2f;
            var zigAmplitude = barHeight * 0.24f;
            const int zigSegments = 14;

            var zigPath = new PathF();
            for (var i = 0; i <= zigSegments; i++)
            {
                var zx = zigStartX + zigSpan * (i / (float)zigSegments);
                var zy = i == 0 || i == zigSegments
                    ? cy
                    : cy + (i % 2 == 1 ? -zigAmplitude : zigAmplitude);
                if (i == 0)
                    zigPath.MoveTo(zx, zy);
                else
                    zigPath.LineTo(zx, zy);
            }

            canvas.StrokeColor = realPrimary.WithAlpha(0.85f);
            canvas.StrokeSize = Math.Max(0.9f, size * 0.016f);
            canvas.StrokeLineCap = LineCap.Round;
            canvas.StrokeLineJoin = LineJoin.Round;
            canvas.DrawPath(zigPath);

            canvas.RestoreState();
        }

        canvas.RestoreState();
    }

    private static void DrawSubLevelAura(
        ICanvas canvas,
        float cx,
        float cy,
        float radius,
        float size,
        int tier,
        int subLevel,
        Color primary,
        Color secondary,
        Color accent,
        bool isLocked)
    {
        // Subnivel >= 2: Anillo rúnico interior
        if (subLevel >= 2)
        {
            canvas.StrokeColor = primary.WithAlpha(isLocked ? 0.25f : 0.45f);
            canvas.StrokeSize = Math.Max(1f, size * 0.016f);
            canvas.DrawCircle(cx, cy, radius * 0.72f);
        }

        // En Tier 0 (Brote Esmeralda) usamos un segundo halo circular orgánico sin líneas rectas ni rombos
        if (tier == 0)
        {
            if (subLevel >= 6)
            {
                canvas.StrokeColor = accent.WithAlpha(isLocked ? 0.22f : 0.38f);
                canvas.StrokeSize = Math.Max(1f, size * 0.016f);
                canvas.DrawCircle(cx, cy, radius * (0.58f + (subLevel - 6) * 0.03f));
            }
            return;
        }

        // Subnivel >= 4: Aletas/destellos laterales de energía
        if (subLevel >= 4)
        {
            var wingSpan = radius * (0.76f + (subLevel - 4) * 0.03f);
            canvas.StrokeColor = accent.WithAlpha(isLocked ? 0.25f : 0.65f);
            canvas.StrokeSize = Math.Max(1.2f, size * 0.022f);
            canvas.DrawLine(cx - radius * 0.48f, cy + radius * 0.1f, cx - wingSpan, cy - radius * 0.18f);
            canvas.DrawLine(cx + radius * 0.48f, cy + radius * 0.1f, cx + wingSpan, cy - radius * 0.18f);
            if (subLevel >= 6)
            {
                canvas.DrawLine(cx - radius * 0.45f, cy + radius * 0.24f, cx - wingSpan * 0.92f, cy + radius * 0.06f);
                canvas.DrawLine(cx + radius * 0.45f, cy + radius * 0.24f, cx + wingSpan * 0.92f, cy + radius * 0.06f);
            }
        }

        // Subnivel >= 6: Halo sagrado / rombo astral detrás de la criatura
        if (subLevel >= 6)
        {
            var haloR = radius * (0.58f + (subLevel - 6) * 0.035f);
            canvas.StrokeColor = accent.WithAlpha(isLocked ? 0.25f : 0.55f);
            canvas.StrokeSize = Math.Max(1.2f, size * 0.02f);
            var diamond = new PathF();
            diamond.MoveTo(cx, cy - haloR);
            diamond.LineTo(cx + haloR, cy);
            diamond.LineTo(cx, cy + haloR);
            diamond.LineTo(cx - haloR, cy);
            diamond.Close();
            canvas.DrawPath(diamond);
        }

        // Subnivel == 9 (Nivel 10/10 de la especie): Estallido de rayos maestros
        if (subLevel == 9)
        {
            canvas.StrokeColor = accent.WithAlpha(isLocked ? 0.3f : 0.75f);
            canvas.StrokeSize = Math.Max(1.2f, size * 0.02f);
            for (var r = 0; r < 8; r++)
            {
                var ang = MathF.PI / 8f + r * (MathF.PI / 4f);
                canvas.DrawLine(
                    cx + MathF.Cos(ang) * radius * 0.62f,
                    cy + MathF.Sin(ang) * radius * 0.62f,
                    cx + MathF.Cos(ang) * radius * 0.88f,
                    cy + MathF.Sin(ang) * radius * 0.88f);
            }
        }
    }

    private static void DrawSubLevelCrown(
        ICanvas canvas,
        float cx,
        float cy,
        float u,
        int subLevel,
        Color primary,
        Color accent,
        bool isLocked)
    {
        // Subnivel >= 5: Gema de poder o marca astral
        if (subLevel >= 5 && subLevel < 8)
        {
            canvas.FillColor = accent.WithAlpha(isLocked ? 0.4f : 0.95f);
            canvas.FillCircle(cx, cy - u * 0.78f, u * 0.075f);
        }
        // Subnivel >= 8: Diadema de evolución máxima de la especie
        else if (subLevel >= 8)
        {
            canvas.FillColor = isLocked ? primary : Color.FromArgb("#FFD54F");
            var crownY = cy - u * 0.72f;
            var crown = new PathF();
            crown.MoveTo(cx - u * 0.22f, crownY);
            crown.LineTo(cx - u * 0.16f, crownY - u * 0.18f);
            crown.LineTo(cx - u * 0.06f, crownY - u * 0.07f);
            crown.LineTo(cx, crownY - u * 0.24f);
            crown.LineTo(cx + u * 0.06f, crownY - u * 0.07f);
            crown.LineTo(cx + u * 0.16f, crownY - u * 0.18f);
            crown.LineTo(cx + u * 0.22f, crownY);
            crown.Close();
            canvas.FillPath(crown);
        }
    }

    private static void DrawTierCreature(
        ICanvas canvas,
        float cx,
        float cy,
        float u,
        int tier,
        int subLevel,
        Color primary,
        Color secondary,
        Color accent,
        bool isLocked)
    {
        var eyeColor = isLocked ? accent : Color.FromArgb("#171725");

        switch (tier)
        {
            case 0: // Semilla -> Brote -> Planta -> Flor de Loto Esmeralda (Máximo 1 par de cotiledones y flor limpia)
                var subProg0 = subLevel / 9f;
                canvas.FillColor = secondary;
                var bodyRx = u * (0.43f + subProg0 * 0.05f);
                var bodyRy = u * (0.34f + subProg0 * 0.04f);
                canvas.FillEllipse(cx - bodyRx, cy + u * 0.24f - bodyRy, bodyRx * 2f, bodyRy * 2f);

                if (subLevel >= 2)
                {
                    canvas.FillColor = accent.WithAlpha(isLocked ? 0.18f : 0.35f);
                    canvas.FillEllipse(cx - u * 0.26f, cy + u * 0.12f, u * 0.52f, u * 0.32f);
                }

                var stemH = u * (0.20f + subProg0 * 0.24f);
                var stemTopY = cy - u * 0.06f - stemH;
                canvas.StrokeColor = accent;
                canvas.StrokeSize = Math.Max(2f, u * 0.095f);
                canvas.DrawLine(cx, cy - u * 0.05f, cx, stemTopY);

                // Un único par de cotiledones suaves (1 en Nv.1, 2 desde Nv.2)
                var leafW = u * (0.26f + subProg0 * 0.12f);
                var leafH = leafW * 0.58f;
                var leafY = cy - u * 0.08f - stemH * 0.62f;
                canvas.FillColor = accent;
                canvas.FillEllipse(cx - leafW * 1.05f, leafY - leafH * 0.5f, leafW, leafH);
                if (subLevel >= 1)
                    canvas.FillEllipse(cx + leafW * 0.05f, leafY - leafH * 0.5f, leafW, leafH);

                // Capullo limpio (Nv. 5-7) -> Flor de 3 pétalos en la punta (Nv. 8-10)
                if (subLevel >= 4 && subLevel < 7)
                {
                    canvas.FillColor = isLocked ? primary : Color.FromArgb("#FFD54F");
                    canvas.FillEllipse(cx - leafW * 0.24f, stemTopY - leafW * 0.55f, leafW * 0.48f, leafW * 0.62f);
                }
                else if (subLevel >= 7)
                {
                    canvas.FillColor = isLocked ? primary : Color.FromArgb("#FFB74D");
                    canvas.FillEllipse(cx - leafW * 0.55f, stemTopY - leafW * 0.48f, leafW * 0.46f, leafW * 0.58f);
                    canvas.FillEllipse(cx + leafW * 0.09f, stemTopY - leafW * 0.48f, leafW * 0.46f, leafW * 0.58f);
                    canvas.FillColor = isLocked ? accent : Color.FromArgb("#FFD54F");
                    canvas.FillEllipse(cx - leafW * 0.26f, stemTopY - leafW * 0.68f, leafW * 0.52f, leafW * 0.68f);
                    if (subLevel >= 8)
                    {
                        canvas.FillColor = isLocked ? primary : Color.FromArgb("#FFF8E1");
                        canvas.FillCircle(cx, stemTopY - leafW * 0.34f, leafW * 0.12f);
                    }
                }
                DrawEyes(canvas, cx, cy + u * 0.20f, u * 0.18f, u * 0.08f, eyeColor, !isLocked);
                break;

            case 1: // Espíritu Neko (Bigotes, cascabel, colas gemelas y orbes que crecen)
                if (subLevel >= 5)
                {
                    // Colas gemelas espirituales
                    canvas.StrokeColor = primary;
                    canvas.StrokeSize = Math.Max(2f, u * 0.1f);
                    canvas.DrawLine(cx - u * 0.3f, cy + u * 0.3f, cx - u * 0.68f, cy - u * 0.15f);
                    if (subLevel >= 7)
                        canvas.DrawLine(cx + u * 0.3f, cy + u * 0.3f, cx + u * 0.68f, cy - u * 0.15f);
                }
                DrawPointedEars(canvas, cx, cy, u, 0.42f + subLevel * 0.018f, primary, accent);
                canvas.FillColor = secondary;
                canvas.FillCircle(cx, cy + u * 0.06f, u * 0.48f);
                // Bigotes que se multiplican
                var whiskers = 1 + subLevel / 4;
                canvas.StrokeColor = accent;
                canvas.StrokeSize = Math.Max(1.2f, u * 0.045f);
                for (var w = 0; w < whiskers; w++)
                {
                    var wy = cy + u * (0.08f + w * 0.09f);
                    canvas.DrawLine(cx - u * 0.28f, wy, cx - u * 0.62f, wy - u * 0.04f);
                    canvas.DrawLine(cx + u * 0.28f, wy, cx + u * 0.62f, wy - u * 0.04f);
                }
                DrawEyes(canvas, cx, cy + u * 0.02f, u * 0.2f, u * 0.09f, eyeColor, !isLocked);
                if (subLevel >= 2)
                {
                    canvas.FillColor = isLocked ? primary : Color.FromArgb("#FFD54F");
                    canvas.FillCircle(cx, cy + u * 0.48f, u * (0.09f + subLevel * 0.005f));
                }
                break;

            case 2: // Zorro Kitsune (De 1 cola hasta 9 colas místicas + fuego kitsunebi)
                var tails = Math.Min(9, 1 + subLevel);
                canvas.FillColor = primary;
                for (var t = 0; t < tails; t++)
                {
                    var off = tails == 1 ? 0f : (t - (tails - 1) / 2f) * (1.5f / Math.Max(2, tails - 1));
                    canvas.FillEllipse(cx + off * u * 0.55f - u * 0.13f, cy - u * 0.64f + MathF.Abs(off) * u * 0.22f, u * 0.26f, u * 0.66f);
                }
                DrawPointedEars(canvas, cx, cy, u, 0.58f + subLevel * 0.015f, primary, accent);
                canvas.FillColor = secondary;
                var foxHead = new PathF();
                foxHead.MoveTo(cx, cy - u * 0.38f);
                foxHead.LineTo(cx + u * 0.52f, cy + u * 0.04f);
                foxHead.LineTo(cx, cy + u * 0.54f);
                foxHead.LineTo(cx - u * 0.52f, cy + u * 0.04f);
                foxHead.Close();
                canvas.FillPath(foxHead);
                DrawEyes(canvas, cx, cy + u * 0.04f, u * 0.19f, u * 0.085f, eyeColor, !isLocked);
                break;

            case 3: // Búho Sabio (Penachos crecientes, alas desplegadas y anillos oculares)
                if (subLevel >= 4)
                    DrawWings(canvas, cx, cy + u * 0.05f, u * (0.75f + subLevel * 0.03f), subLevel, primary);
                // Penachos de sabiduría
                var tuftH = u * (0.25f + subLevel * 0.035f);
                canvas.StrokeColor = accent;
                canvas.StrokeSize = Math.Max(2f, u * 0.09f);
                canvas.DrawLine(cx - u * 0.22f, cy - u * 0.28f, cx - u * 0.48f, cy - u * 0.28f - tuftH);
                canvas.DrawLine(cx + u * 0.22f, cy - u * 0.28f, cx + u * 0.48f, cy - u * 0.28f - tuftH);

                canvas.FillColor = secondary;
                canvas.FillEllipse(cx - u * 0.46f, cy - u * 0.36f, u * 0.92f, u * 0.88f);
                canvas.FillColor = primary;
                canvas.FillCircle(cx - u * 0.22f, cy - u * 0.02f, u * (0.19f + subLevel * 0.005f));
                canvas.FillCircle(cx + u * 0.22f, cy - u * 0.02f, u * (0.19f + subLevel * 0.005f));
                DrawEyes(canvas, cx, cy - u * 0.02f, u * 0.22f, u * 0.1f, eyeColor, !isLocked);
                DrawBeak(canvas, cx, cy + u * 0.1f, u * 0.12f, isLocked ? accent : Color.FromArgb("#FFD54F"));
                break;

            case 4: // Lobo Boreal (Pelaje lateral erizado que crece + luna creciente boreal)
                DrawPointedEars(canvas, cx, cy, u, 0.48f + subLevel * 0.02f, primary, accent);
                var furSpikes = 1 + subLevel / 3;
                canvas.FillColor = primary;
                for (var s = 0; s < furSpikes; s++)
                {
                    var sy = cy - u * 0.05f + s * u * 0.14f;
                    canvas.FillEllipse(cx - u * 0.72f, sy, u * 0.35f, u * 0.14f);
                    canvas.FillEllipse(cx + u * 0.37f, sy, u * 0.35f, u * 0.14f);
                }
                canvas.FillColor = secondary;
                var wolfHead = new PathF();
                wolfHead.MoveTo(cx, cy - u * 0.45f);
                wolfHead.LineTo(cx + u * 0.56f, cy + u * 0.06f);
                wolfHead.LineTo(cx, cy + u * 0.56f);
                wolfHead.LineTo(cx - u * 0.56f, cy + u * 0.06f);
                wolfHead.Close();
                canvas.FillPath(wolfHead);
                DrawEyes(canvas, cx, cy + u * 0.02f, u * 0.20f, u * 0.085f, eyeColor, !isLocked);
                break;

            case 5: // Tigre Guardián (Orejas redondas + rayas que aumentan + colmillos sable crecientes)
                canvas.FillColor = primary;
                canvas.FillCircle(cx - u * 0.36f, cy - u * 0.34f, u * 0.18f);
                canvas.FillCircle(cx + u * 0.36f, cy - u * 0.34f, u * 0.18f);
                canvas.FillColor = secondary;
                canvas.FillEllipse(cx - u * 0.52f, cy - u * 0.38f, u * 1.04f, u * 0.84f);

                // Rayas de tigre según subnivel
                var stripes = 1 + subLevel / 3;
                canvas.StrokeColor = primary;
                canvas.StrokeSize = Math.Max(1.8f, u * 0.07f);
                for (var st = 0; st < stripes; st++)
                {
                    var sy = cy - u * 0.12f + st * u * 0.13f;
                    canvas.DrawLine(cx - u * 0.48f, sy, cx - u * 0.28f, sy);
                    canvas.DrawLine(cx + u * 0.28f, sy, cx + u * 0.48f, sy);
                }

                // Colmillos sable que crecen con el subnivel
                var fangLen = u * (0.14f + subLevel * 0.022f);
                canvas.FillColor = accent;
                canvas.FillEllipse(cx - u * 0.24f, cy + u * 0.28f, u * 0.10f, fangLen);
                canvas.FillEllipse(cx + u * 0.14f, cy + u * 0.28f, u * 0.10f, fangLen);
                DrawEyes(canvas, cx, cy + u * 0.02f, u * 0.21f, u * 0.085f, eyeColor, !isLocked);
                break;

            case 6: // León Solar (Melena de pétalos y rayos solares que crecen de 8 a 17)
                var rays = 8 + subLevel;
                canvas.FillColor = primary;
                for (var r = 0; r < rays; r++)
                {
                    var ang = r * (MathF.PI * 2f / rays);
                    var dist = u * (0.50f + (r % 2 == 0 ? subLevel * 0.015f : 0f));
                    canvas.FillCircle(cx + MathF.Cos(ang) * dist, cy + MathF.Sin(ang) * dist, u * 0.19f);
                }
                canvas.FillColor = secondary;
                canvas.FillCircle(cx, cy, u * 0.45f);
                DrawEyes(canvas, cx, cy - u * 0.02f, u * 0.19f, u * 0.085f, eyeColor, !isLocked);
                break;

            case 7: // Ciervo del Bosque (Cornamenta que suma puntas y flores según subnivel)
                var hornH = u * (0.45f + subLevel * 0.038f);
                canvas.StrokeColor = accent;
                canvas.StrokeSize = Math.Max(2f, u * 0.09f);
                canvas.DrawLine(cx - u * 0.18f, cy - u * 0.22f, cx - u * 0.55f, cy - u * 0.22f - hornH);
                canvas.DrawLine(cx + u * 0.18f, cy - u * 0.22f, cx + u * 0.55f, cy - u * 0.22f - hornH);

                var tines = 1 + subLevel / 3;
                for (var t = 0; t < tines; t++)
                {
                    var frac = (t + 1f) / (tines + 1f);
                    var bx = u * (0.18f + 0.37f * frac);
                    var by = cy - u * 0.22f - hornH * frac;
                    canvas.DrawLine(cx - bx, by, cx - bx + u * 0.18f, by - u * 0.22f);
                    canvas.DrawLine(cx + bx, by, cx + bx - u * 0.18f, by - u * 0.22f);
                }
                canvas.FillColor = secondary;
                canvas.FillEllipse(cx - u * 0.38f, cy - u * 0.22f, u * 0.76f, u * 0.70f);
                DrawEyes(canvas, cx, cy + u * 0.10f, u * 0.18f, u * 0.08f, eyeColor, !isLocked);
                break;

            case 8: // Fénix Carmesí (Capas de alas y plumas de cresta que se multiplican)
                var wingLayers = 1 + subLevel / 4;
                for (var wl = 0; wl < wingLayers; wl++)
                {
                    DrawWings(canvas, cx, cy + wl * u * 0.12f, u * (1f - wl * 0.12f), subLevel, wl % 2 == 0 ? primary : accent);
                }
                var plumes = 1 + (subLevel / 3) * 2; // 1, 3, 5, 7
                canvas.FillColor = accent;
                for (var c = 0; c < plumes; c++)
                {
                    var off = c - (plumes - 1) / 2f;
                    canvas.FillEllipse(cx + off * u * 0.13f - u * 0.05f, cy - u * 0.74f + MathF.Abs(off) * u * 0.08f, u * 0.10f, u * 0.36f);
                }
                canvas.FillColor = secondary;
                canvas.FillCircle(cx, cy + u * 0.06f, u * 0.40f);
                DrawEyes(canvas, cx, cy + u * 0.02f, u * 0.16f, u * 0.075f, eyeColor, !isLocked);
                DrawBeak(canvas, cx, cy + u * 0.10f, u * 0.11f, accent);
                break;

            case 9: // Gólem Rúnico de Cristal (Fragmentos cristalinos flotantes que crecen de 0 a 6)
                var shards = subLevel * 2 / 3;
                canvas.FillColor = accent;
                for (var s = 0; s < shards; s++)
                {
                    var ang = -MathF.PI / 2f + s * (MathF.PI * 2f / Math.Max(1, shards));
                    canvas.FillCircle(cx + MathF.Cos(ang) * u * 0.76f, cy + MathF.Sin(ang) * u * 0.76f, u * 0.10f);
                }
                canvas.FillColor = secondary;
                var hex = new PathF();
                for (var i = 0; i < 6; i++)
                {
                    var ang = -MathF.PI / 2f + i * (MathF.PI / 3f);
                    var hx = cx + MathF.Cos(ang) * u * 0.60f;
                    var hy = cy + MathF.Sin(ang) * u * 0.60f;
                    if (i == 0) hex.MoveTo(hx, hy);
                    else hex.LineTo(hx, hy);
                }
                hex.Close();
                canvas.FillPath(hex);
                canvas.FillColor = primary;
                canvas.FillRoundedRectangle(cx - u * 0.34f, cy - u * 0.12f, u * 0.68f, u * 0.22f, u * 0.08f);
                canvas.FillColor = accent;
                canvas.FillCircle(cx, cy - u * 0.01f, u * (0.09f + subLevel * 0.008f));
                break;

            case 10: // Kraken Abisal (Tentáculos que crecen de 3 a 10 + ojos bioluminiscentes)
                var tentacles = 3 + (subLevel * 7) / 9;
                canvas.StrokeColor = primary;
                canvas.StrokeSize = Math.Max(1.8f, u * 0.095f);
                for (var t = 0; t < tentacles; t++)
                {
                    var tx = cx + (t - (tentacles - 1) / 2f) * u * (1.0f / Math.Max(3, tentacles));
                    canvas.DrawLine(tx, cy + u * 0.15f, tx + (t % 2 == 0 ? -1 : 1) * u * 0.12f, cy + u * (0.55f + subLevel * 0.02f));
                }
                canvas.FillColor = secondary;
                var mantle = new PathF();
                mantle.MoveTo(cx, cy - u * (0.62f + subLevel * 0.015f));
                mantle.LineTo(cx + u * 0.52f, cy + u * 0.05f);
                mantle.LineTo(cx - u * 0.52f, cy + u * 0.05f);
                mantle.Close();
                canvas.FillPath(mantle);
                canvas.FillCircle(cx, cy + u * 0.05f, u * 0.42f);
                DrawEyes(canvas, cx, cy + u * 0.08f, u * 0.22f, u * 0.08f, accent, false);
                if (subLevel >= 3)
                {
                    canvas.FillColor = accent;
                    canvas.FillCircle(cx, cy - u * 0.12f, u * 0.09f);
                }
                break;

            case 11: // Cronos Autómata (Dientes de engranaje de 6 a 15 + anillos concéntricos)
                var teeth = 6 + subLevel;
                canvas.FillColor = primary;
                for (var i = 0; i < teeth; i++)
                {
                    var ang = i * (MathF.PI * 2f / teeth);
                    canvas.FillCircle(cx + MathF.Cos(ang) * u * 0.60f, cy + MathF.Sin(ang) * u * 0.60f, u * 0.12f);
                }
                canvas.FillColor = secondary;
                canvas.FillCircle(cx, cy, u * 0.52f);
                canvas.FillColor = primary;
                canvas.FillCircle(cx, cy, u * 0.36f);
                if (subLevel >= 4)
                {
                    canvas.StrokeColor = accent;
                    canvas.StrokeSize = Math.Max(1.2f, u * 0.04f);
                    canvas.DrawCircle(cx, cy, u * 0.26f);
                }
                canvas.StrokeColor = accent;
                canvas.StrokeSize = Math.Max(2f, u * 0.08f);
                canvas.DrawLine(cx, cy, cx, cy - u * (0.24f + subLevel * 0.01f));
                canvas.DrawLine(cx, cy, cx + u * 0.22f, cy + u * 0.1f);
                canvas.FillColor = accent;
                canvas.FillCircle(cx, cy, u * 0.09f);
                break;

            case 12: // Dragón Imperial Ryu (Cuernos ramificados + bigotes + perla imperial)
                if (subLevel >= 2)
                    DrawWings(canvas, cx, cy, u * (0.85f + subLevel * 0.02f), subLevel, primary);
                canvas.StrokeColor = accent;
                canvas.StrokeSize = Math.Max(2f, u * 0.09f);
                canvas.DrawLine(cx - u * 0.22f, cy - u * 0.3f, cx - u * 0.48f, cy - u * (0.62f + subLevel * 0.02f));
                canvas.DrawLine(cx + u * 0.22f, cy - u * 0.3f, cx + u * 0.48f, cy - u * (0.62f + subLevel * 0.02f));
                canvas.DrawLine(cx - u * 0.3f, cy + u * 0.15f, cx - u * (0.65f + subLevel * 0.02f), cy + u * 0.05f);
                canvas.DrawLine(cx + u * 0.3f, cy + u * 0.15f, cx + u * (0.65f + subLevel * 0.02f), cy + u * 0.05f);
                canvas.FillColor = secondary;
                canvas.FillCircle(cx, cy + u * 0.04f, u * 0.44f);
                DrawEyes(canvas, cx, cy, u * 0.19f, u * 0.085f, eyeColor, !isLocked);
                if (subLevel >= 4)
                {
                    canvas.FillColor = accent;
                    canvas.FillCircle(cx, cy + u * 0.42f, u * 0.11f);
                }
                break;

            case 13: // Polilla Astral (Alas que crecen y suman ocelos lunares según subnivel)
                var wingGrowth = 0.82f + subLevel * 0.025f;
                canvas.FillColor = secondary;
                canvas.FillEllipse(cx - u * 0.78f * wingGrowth, cy - u * 0.55f, u * 0.72f * wingGrowth, u * 0.58f);
                canvas.FillEllipse(cx + u * 0.06f * wingGrowth, cy - u * 0.55f, u * 0.72f * wingGrowth, u * 0.58f);
                canvas.FillColor = primary;
                canvas.FillEllipse(cx - u * 0.62f * wingGrowth, cy - u * 0.05f, u * 0.55f * wingGrowth, u * 0.55f);
                canvas.FillEllipse(cx + u * 0.07f * wingGrowth, cy - u * 0.05f, u * 0.55f * wingGrowth, u * 0.55f);
                canvas.FillColor = accent;
                canvas.FillCircle(cx - u * 0.42f * wingGrowth, cy - u * 0.26f, u * 0.11f);
                canvas.FillCircle(cx + u * 0.42f * wingGrowth, cy - u * 0.26f, u * 0.11f);
                if (subLevel >= 4)
                {
                    canvas.FillCircle(cx - u * 0.32f * wingGrowth, cy + u * 0.22f, u * 0.08f);
                    canvas.FillCircle(cx + u * 0.32f * wingGrowth, cy + u * 0.22f, u * 0.08f);
                }
                canvas.FillColor = primary;
                canvas.FillEllipse(cx - u * 0.14f, cy - u * 0.45f, u * 0.28f, u * 0.9f);
                break;

            case 14: // Serafín Ophanim (Suma anillos entrelazados y pares de alas con el subnivel)
                DrawWings(canvas, cx, cy, u * (0.90f + subLevel * 0.02f), subLevel, primary);
                canvas.StrokeColor = secondary;
                canvas.StrokeSize = Math.Max(2f, u * 0.10f);
                canvas.DrawEllipse(cx - u * 0.68f, cy - u * 0.24f, u * 1.36f, u * 0.48f);
                if (subLevel >= 2)
                    canvas.DrawEllipse(cx - u * 0.24f, cy - u * 0.68f, u * 0.48f, u * 1.36f);
                if (subLevel >= 6)
                    canvas.DrawCircle(cx, cy, u * 0.56f);
                canvas.FillColor = accent;
                canvas.FillCircle(cx, cy, u * 0.25f);
                canvas.FillColor = eyeColor;
                canvas.FillCircle(cx, cy, u * 0.11f);
                break;

            case 15: // Hidra Legendaria (Evoluciona de 1 cabeza -> 2 cabezas -> 3 cabezas -> 5 cabezas)
                var heads = subLevel < 2 ? 1 : subLevel < 5 ? 2 : subLevel < 8 ? 3 : 5;
                canvas.StrokeColor = primary;
                canvas.StrokeSize = Math.Max(2.2f, u * 0.12f);
                for (var h = 0; h < heads; h++)
                {
                    var off = heads == 1 ? 0f : (h - (heads - 1) / 2f) * (1.15f / Math.Max(1, heads - 1));
                    var hx = cx + off * u * 0.52f;
                    var hy = cy - u * 0.28f + MathF.Abs(off) * u * 0.26f;
                    canvas.DrawLine(cx, cy + u * 0.55f, hx, hy);
                }
                for (var h = 0; h < heads; h++)
                {
                    var off = heads == 1 ? 0f : (h - (heads - 1) / 2f) * (1.15f / Math.Max(1, heads - 1));
                    var hx = cx + off * u * 0.52f;
                    var hy = cy - u * 0.28f + MathF.Abs(off) * u * 0.26f;
                    var hr = u * (heads <= 2 ? 0.26f : heads == 3 ? 0.23f : 0.19f);
                    canvas.FillColor = secondary;
                    canvas.FillCircle(hx, hy, hr);
                    canvas.FillColor = accent;
                    canvas.FillCircle(hx, hy, hr * 0.34f);
                }
                break;

            case 16: // Djinn Astral (Vórtice + orbes de deseos que se multiplican con el subnivel)
                canvas.FillColor = primary;
                var vortex = new PathF();
                vortex.MoveTo(cx - u * 0.42f, cy + u * 0.05f);
                vortex.LineTo(cx + u * 0.42f, cy + u * 0.05f);
                vortex.LineTo(cx, cy + u * 0.72f);
                vortex.Close();
                canvas.FillPath(vortex);

                var wishOrbs = subLevel / 2;
                canvas.FillColor = accent;
                for (var w = 0; w < wishOrbs; w++)
                {
                    var side = w % 2 == 0 ? -1 : 1;
                    var row = w / 2;
                    canvas.FillCircle(cx + side * u * (0.58f + row * 0.08f), cy - u * 0.05f + row * u * 0.22f, u * 0.085f);
                }

                canvas.FillColor = secondary;
                canvas.FillCircle(cx, cy - u * 0.12f, u * 0.36f);
                canvas.FillColor = primary;
                canvas.FillEllipse(cx - u * 0.42f, cy - u * 0.52f, u * 0.84f, u * 0.34f);
                canvas.FillColor = accent;
                canvas.FillCircle(cx, cy - u * 0.38f, u * (0.09f + subLevel * 0.005f));
                DrawEyes(canvas, cx, cy - u * 0.08f, u * 0.16f, u * 0.07f, accent, false);
                break;

            case 17: // Valkiria Celestial (Alas del yelmo que crecen + lanzas de luz en niveles altos)
                DrawWings(canvas, cx, cy - u * 0.1f, u * (0.82f + subLevel * 0.025f), subLevel, accent);
                if (subLevel >= 4)
                {
                    canvas.StrokeColor = primary;
                    canvas.StrokeSize = Math.Max(1.8f, u * 0.08f);
                    canvas.DrawLine(cx - u * 0.65f, cy + u * 0.55f, cx + u * 0.65f, cy - u * 0.55f);
                    canvas.DrawLine(cx + u * 0.65f, cy + u * 0.55f, cx - u * 0.65f, cy - u * 0.55f);
                }
                canvas.FillColor = secondary;
                var helm = new PathF();
                helm.MoveTo(cx, cy - u * 0.65f);
                helm.LineTo(cx + u * 0.46f, cy - u * 0.15f);
                helm.LineTo(cx + u * 0.34f, cy + u * 0.52f);
                helm.LineTo(cx, cy + u * 0.65f);
                helm.LineTo(cx - u * 0.34f, cy + u * 0.52f);
                helm.LineTo(cx - u * 0.46f, cy - u * 0.15f);
                helm.Close();
                canvas.FillPath(helm);
                canvas.StrokeColor = isLocked ? primary : Color.FromArgb("#171725");
                canvas.StrokeSize = Math.Max(2.5f, u * 0.11f);
                canvas.DrawLine(cx - u * 0.26f, cy - u * 0.05f, cx + u * 0.26f, cy - u * 0.05f);
                canvas.DrawLine(cx, cy - u * 0.05f, cx, cy + u * 0.42f);
                break;

            case 18: // Arquitecto Merkaba (Suma triángulos dimensionales y nodos en los vértices)
                canvas.FillColor = secondary;
                var triUp = new PathF();
                triUp.MoveTo(cx, cy - u * 0.72f);
                triUp.LineTo(cx + u * 0.64f, cy + u * 0.38f);
                triUp.LineTo(cx - u * 0.64f, cy + u * 0.38f);
                triUp.Close();
                canvas.FillPath(triUp);

                if (subLevel >= 1)
                {
                    canvas.FillColor = primary.WithAlpha(0.85f);
                    var triDown = new PathF();
                    triDown.MoveTo(cx, cy + u * 0.72f);
                    triDown.LineTo(cx + u * 0.64f, cy - u * 0.38f);
                    triDown.LineTo(cx - u * 0.64f, cy - u * 0.38f);
                    triDown.Close();
                    canvas.FillPath(triDown);
                }

                if (subLevel >= 4)
                {
                    var nodes = 3 + (subLevel >= 7 ? 3 : 0);
                    canvas.FillColor = accent;
                    for (var n = 0; n < nodes; n++)
                    {
                        var ang = -MathF.PI / 2f + n * (MathF.PI * 2f / nodes);
                        canvas.FillCircle(cx + MathF.Cos(ang) * u * 0.72f, cy + MathF.Sin(ang) * u * 0.72f, u * 0.08f);
                    }
                }

                canvas.FillColor = accent;
                canvas.FillCircle(cx, cy, u * (0.20f + subLevel * 0.008f));
                canvas.FillColor = eyeColor;
                canvas.FillCircle(cx, cy, u * 0.1f);
                break;

            default: // 19: Singularidad Cósmica (Suma anillos de acreción y corona cósmica)
                canvas.StrokeColor = accent;
                canvas.StrokeSize = Math.Max(2f, u * 0.09f);
                canvas.DrawEllipse(cx - u * 0.82f, cy - u * 0.26f, u * 1.64f, u * 0.52f);
                if (subLevel >= 3)
                    canvas.DrawEllipse(cx - u * 0.26f, cy - u * 0.82f, u * 0.52f, u * 1.64f);

                canvas.FillColor = isLocked ? primary : Color.FromArgb("#FFD740");
                var crown = new PathF();
                crown.MoveTo(cx - u * 0.42f, cy - u * 0.35f);
                crown.LineTo(cx - u * 0.32f, cy - u * 0.72f);
                crown.LineTo(cx - u * 0.12f, cy - u * 0.48f);
                crown.LineTo(cx, cy - u * 0.82f);
                crown.LineTo(cx + u * 0.12f, cy - u * 0.48f);
                crown.LineTo(cx + u * 0.32f, cy - u * 0.72f);
                crown.LineTo(cx + u * 0.42f, cy - u * 0.35f);
                crown.Close();
                canvas.FillPath(crown);

                canvas.FillColor = secondary;
                canvas.FillCircle(cx, cy, u * 0.44f);
                canvas.FillColor = isLocked ? primary : Color.FromArgb("#0B0719");
                canvas.FillCircle(cx, cy, u * 0.28f);
                canvas.FillColor = accent;
                canvas.FillCircle(cx - u * 0.1f, cy - u * 0.04f, u * 0.06f);
                canvas.FillCircle(cx + u * 0.1f, cy - u * 0.04f, u * 0.06f);
                break;
        }
    }

    private static void DrawPointedEars(ICanvas canvas, float cx, float cy, float u, float heightFactor, Color primary, Color accent)
    {
        var earH = u * heightFactor;
        canvas.FillColor = primary;
        var left = new PathF();
        left.MoveTo(cx - u * 0.42f, cy - u * 0.12f);
        left.LineTo(cx - u * 0.54f, cy - u * 0.3f - earH);
        left.LineTo(cx - u * 0.1f, cy - u * 0.38f);
        left.Close();
        canvas.FillPath(left);

        var right = new PathF();
        right.MoveTo(cx + u * 0.42f, cy - u * 0.12f);
        right.LineTo(cx + u * 0.54f, cy - u * 0.3f - earH);
        right.LineTo(cx + u * 0.1f, cy - u * 0.38f);
        right.Close();
        canvas.FillPath(right);
    }

    private static void DrawWings(ICanvas canvas, float cx, float cy, float u, int subLevel, Color wingColor)
    {
        var span = u * (0.82f + subLevel * 0.025f);
        var height = u * (0.52f + subLevel * 0.02f);
        canvas.FillColor = wingColor;

        var left = new PathF();
        left.MoveTo(cx - u * 0.2f, cy + u * 0.08f);
        left.CurveTo(cx - span, cy - height, cx - span, cy + height * 0.35f, cx - u * 0.25f, cy + u * 0.35f);
        left.Close();
        canvas.FillPath(left);

        var right = new PathF();
        right.MoveTo(cx + u * 0.2f, cy + u * 0.08f);
        right.CurveTo(cx + span, cy - height, cx + span, cy + height * 0.35f, cx + u * 0.25f, cy + u * 0.35f);
        right.Close();
        canvas.FillPath(right);
    }

    private static void DrawEyes(ICanvas canvas, float cx, float eyeY, float offset, float radius, Color eyeColor, bool drawShine)
    {
        canvas.FillColor = eyeColor;
        canvas.FillCircle(cx - offset, eyeY, radius);
        canvas.FillCircle(cx + offset, eyeY, radius);
        if (drawShine)
        {
            canvas.FillColor = Colors.White;
            canvas.FillCircle(cx - offset - radius * 0.25f, eyeY - radius * 0.25f, radius * 0.4f);
            canvas.FillCircle(cx + offset - radius * 0.25f, eyeY - radius * 0.25f, radius * 0.4f);
        }
    }

    private static void DrawBeak(ICanvas canvas, float cx, float beakY, float size, Color color)
    {
        canvas.FillColor = color;
        var beak = new PathF();
        beak.MoveTo(cx - size, beakY);
        beak.LineTo(cx + size, beakY);
        beak.LineTo(cx, beakY + size * 1.4f);
        beak.Close();
        canvas.FillPath(beak);
    }
}
