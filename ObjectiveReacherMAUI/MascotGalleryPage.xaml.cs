using Microsoft.Maui.Graphics;

namespace ObjectiveReacherMAUI;

public sealed record MascotGalleryItem(
    int Level,
    string Label,
    string Stage,
    bool IsLocked,
    Color CardBackground,
    Color BorderColor,
    Color TitleColor);

public partial class MascotGalleryPage : ContentPage
{
    private readonly int _unlockedLevel;

    private static readonly string[] StageNames =
    [
        "Brote Esmeralda",
        "Espíritu Neko",
        "Zorro Kitsune",
        "Búho Sabio",
        "Lobo Boreal",
        "Tigre Guardián",
        "León Solar",
        "Ciervo del Bosque",
        "Fénix Carmesí",
        "Gólem de Cristal",
        "Kraken Abisal",
        "Cronos Autómata",
        "Dragón Imperial",
        "Polilla Astral",
        "Serafín Ophanim",
        "Hidra Tricéfala",
        "Djinn Astral",
        "Valkiria Celestial",
        "Arquitecto Merkaba",
        "Singularidad Cósmica"
    ];

    private static readonly string[] StageHints =
    [
        "Una pequeña semilla que germina con tus primeros pasos.",
        "Un espíritu felino curioso que trae fortuna a quienes perseveran.",
        "Sus colas místicas se multiplican con cada nuevo nivel.",
        "Sus grandes ojos ven la meta incluso en la noche más oscura.",
        "Aúlla bajo la aurora boreal guiando tu racha.",
        "Sus colmillos y rayas protegen el progreso alcanzado.",
        "Una melena de fuego solar que arde con tu disciplina.",
        "En sus astas milenarias florece la constancia del bosque.",
        "Renace de las cenizas desplegando alas incandescentes.",
        "Un coloso hexagonal tallado en cristal rúnico viviente.",
        "Sus tentáculos emergen de las profundidades abisales.",
        "Engranajes eternos y agujas doradas que dominan el tiempo.",
        "Custodia la perla imperial entre las nubes orientales.",
        "Cuatro alas lunares con ocelos que reflejan las galaxias.",
        "Anillos entrelazados y seis alas de fuego sagrado.",
        "Tres cabezas legendarias que jamás retroceden ante un reto.",
        "Emerge de un vórtice estelar para conceder grandes metas.",
        "Yelmo alado y visor resplandeciente de los salones eternos.",
        "Geometría sagrada multidimensional que trasciende el espacio.",
        "Un quásar viviente coronado en el centro del universo."
    ];

    public MascotGalleryPage(int currentUserLevel = 1)
    {
        InitializeComponent();
        _unlockedLevel = Math.Max(1, currentUserLevel);

        var items = Enumerable.Range(1, 200)
            .Select(lvl =>
            {
                var isLocked = lvl > _unlockedLevel;
                var tier = Math.Clamp((lvl - 1) / 10, 0, StageNames.Length - 1);
                return new MascotGalleryItem(
                    lvl,
                    isLocked ? $"🔒 Nv. {lvl}" : $"Nv. {lvl}",
                    isLocked ? "？？？" : StageNames[tier],
                    isLocked,
                    Color.FromArgb(isLocked ? "#151521" : "#1C1C2A"),
                    Color.FromArgb(isLocked ? "#252438" : "#4A3B6E"),
                    Color.FromArgb(isLocked ? "#88839E" : "#F4F1FF"));
            })
            .ToList();
        MascotCollectionView.ItemsSource = items;

        var clamped = Math.Clamp(_unlockedLevel, 1, 200);
        LevelSlider.Value = clamped;
        UpdatePreview(clamped);
    }

    private void OnSliderValueChanged(object? sender, ValueChangedEventArgs e)
    {
        var level = (int)Math.Round(e.NewValue);
        UpdatePreview(level);
    }

    private void UpdatePreview(int level)
    {
        var tier = Math.Clamp((level - 1) / 10, 0, StageNames.Length - 1);
        var subLevel = (level - 1) % 10 + 1;
        var isLocked = level > _unlockedLevel;

        PreviewMascotView.Level = level;
        PreviewMascotView.IsLocked = isLocked;

        if (isLocked)
        {
            PreviewLevelLabel.Text = $"🔒 Nivel {level} · Criatura Misteriosa";
            PreviewStageLabel.Text = $"Etapa {tier + 1}/20 · Evolución {subLevel}/10 (Alcanza el nivel {level} para revelarla)";
            PreviewHintLabel.Text = $"Pista: {StageHints[tier]}";
        }
        else
        {
            PreviewLevelLabel.Text = $"✨ Nivel {level} · {StageNames[tier]}";
            PreviewStageLabel.Text = $"Etapa {tier + 1}/20 · Evolución {subLevel}/10 (Desbloqueada)";
            PreviewHintLabel.Text = StageHints[tier];
        }
    }

    private async void OnCloseClicked(object? sender, EventArgs e) => await Navigation.PopModalAsync();
}
