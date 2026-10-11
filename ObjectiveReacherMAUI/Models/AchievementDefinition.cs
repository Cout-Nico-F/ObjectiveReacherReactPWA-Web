namespace ObjectiveReacherMAUI.Models;

public enum AchievementCondition
{
    None,
    EntryCount,
    StreakDays,
    ProgressPercent,
    LargestContributionPercent,
    WeekendEntryCount,
    EarlyEntryCount,
    LateEntryCount
}

public sealed record AchievementDefinition(
    string Id,
    string Title,
    string Description,
    string Icon,
    int RewardXp,
    bool IsSecret = false,
    AchievementCondition Condition = AchievementCondition.None,
    decimal Threshold = 0);

public static class AchievementCatalog
{
    public const string FirstEntryId = "first-entry";
    public const string ThreeDayStreakId = "streak-3";
    public const string SevenDayStreakId = "streak-7";
    public const string Progress25Id = "progress-25";
    public const string Progress50Id = "progress-50";
    public const string Progress100Id = "progress-100";
    public const string GoalCompleteId = "goal-complete";

    public static IReadOnlyList<AchievementDefinition> All { get; } = CreateAll();

    private static IReadOnlyList<AchievementDefinition> CreateAll()
    {
        var achievements = new List<AchievementDefinition>
        {
            new(FirstEntryId, "Primer paso", "Registra tu primera entrada", "🟢", 50),
            new(ThreeDayStreakId, "En marcha", "3 días consecutivos", "🌱", 90),
            new(SevenDayStreakId, "Constante", "7 días consecutivos", "🔥", 180),
            new(Progress25Id, "Un cuarto", "Alcanza el 25% de tu objetivo", "🥉", 100),
            new(Progress50Id, "A mitad de camino", "Alcanza el 50% de tu objetivo", "🎯", 200),
            new(Progress100Id, "Al máximo", "Alcanza el 100% de tu objetivo", "💯", 350),
            new(GoalCompleteId, "Objetivo cumplido", "Completa tu objetivo", "🏆", 500)
        };

        AddThresholdAchievements(achievements, AchievementCondition.EntryCount,
            [2, 5, 10, 20, 30, 50, 75, 100, 150, 250],
            ["Dúo", "Coleccionista", "Diez pasos", "Imparable", "Ritmo propio", "Medio centenar", "Gran constancia", "Centenario", "Maratón", "Leyenda"],
            ["Registra {0} entradas en este objetivo", "Cada registro suma. ¿Cuántos llevas?", "La constancia se cuenta entrada a entrada."],
            "🗝️");
        AddThresholdAchievements(achievements, AchievementCondition.StreakDays,
            [2, 4, 10, 14, 21, 30, 45, 60, 90, 100],
            ["Segundo día", "Racha encendida", "Diez seguidos", "Dos semanas", "Tres semanas", "Un mes", "Sin pausa", "Dos meses", "Trimestre firme", "Cien días"],
            ["Mantén tu racha durante {0} días", "Vuelve mañana para descubrirlo.", "La pista está en tus días activos."],
            "🌘");
        AddThresholdAchievements(achievements, AchievementCondition.ProgressPercent,
            [5, 10, 15, 20, 30, 40, 60, 70, 80, 90],
            ["Primera señal", "Despegue", "En camino", "Un quinto", "Casi un tercio", "Buen impulso", "Más de la mitad", "Tramo avanzado", "A la vista", "Último tramo"],
            ["Alcanza el {0}% de tu objetivo", "Tu progreso guarda una sorpresa.", "Sigue avanzando para revelar este secreto."],
            "🌟");
        AddThresholdAchievements(achievements, AchievementCondition.LargestContributionPercent,
            [1, 5, 10, 25, 50],
            ["Pequeño gran paso", "Aporte notable", "De una vez", "Salto gigante", "Medio objetivo"],
            ["Haz un aporte individual equivalente al {0}% de tu objetivo", "Una sola entrada puede revelar la pista.", "Mira el tamaño de uno de tus aportes."],
            "💎");
        AddThresholdAchievements(achievements, AchievementCondition.WeekendEntryCount,
            [1, 5, 10, 25, 50],
            ["Fin de semana", "Sábado productivo", "Ritmo de descanso", "Fines constantes", "Sin días libres"],
            ["Registra {0} entradas durante fines de semana", "Tus días libres también cuentan.", "El calendario conoce la respuesta."],
            "🌙");
        AddThresholdAchievements(achievements, AchievementCondition.EarlyEntryCount,
            [1, 3, 7, 15, 30],
            ["Amanecer activo", "Madrugador", "Primera luz", "Antes que el sol", "Alba legendaria"],
            ["Registra {0} entradas antes de las 8:00", "La pista aparece al empezar temprano.", "Una hora concreta guarda el secreto."],
            "🌅");
        AddThresholdAchievements(achievements, AchievementCondition.LateEntryCount,
            [1, 3, 7, 15, 30],
            ["Última hora", "Búho", "Luna constante", "Tras el anochecer", "Noctámbulo legendario"],
            ["Registra {0} entradas desde las 21:00", "La noche también suma progreso.", "Busca la respuesta en la hora de tus registros."],
            "🌙");

        return achievements;
    }

    private static readonly int[] TenStepRewards = [40, 70, 110, 160, 220, 300, 400, 520, 660, 850];
    private static readonly int[] FiveStepRewards = [50, 100, 180, 300, 480];

    private static void AddThresholdAchievements(
        ICollection<AchievementDefinition> achievements,
        AchievementCondition condition,
        IReadOnlyList<int> thresholds,
        IReadOnlyList<string> titles,
        IReadOnlyList<string> hints,
        string icon)
    {
        var rewardTable = thresholds.Count == 5 ? FiveStepRewards : TenStepRewards;
        for (var index = 0; index < thresholds.Count; index++)
        {
            var threshold = thresholds[index];
            var title = titles[index];
            var hint = hints[index % hints.Count];
            var rewardXp = rewardTable[Math.Clamp(index, 0, rewardTable.Length - 1)];
            achievements.Add(new AchievementDefinition(
                $"secret-{condition.ToString().ToLowerInvariant()}-{threshold}",
                title,
                string.Format(System.Globalization.CultureInfo.InvariantCulture, hint, threshold),
                icon,
                rewardXp,
                IsSecret: true,
                Condition: condition,
                Threshold: threshold));
        }
    }
}
