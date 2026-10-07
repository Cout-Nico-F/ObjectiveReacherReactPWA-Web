using System.Text.Json;
using Microsoft.Maui.Storage;
using ObjectiveReacherMAUI.Models;

namespace ObjectiveReacherMAUI.Services;

public sealed class JsonDashboardRepository : IDashboardRepository
{
    private const int CurrentVersion = 5;
    private static readonly JsonSerializerOptions SerializerOptions = new() { WriteIndented = true };
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly string _filePath = Path.Combine(FileSystem.AppDataDirectory, "dashboard.json");

    public async Task<DashboardState?> LoadAsync(CancellationToken cancellationToken = default)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            if (!File.Exists(_filePath))
                return null;

            await using var stream = new FileStream(
                _filePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                bufferSize: 4096,
                useAsync: true);

            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var version = document.RootElement.TryGetProperty(nameof(DashboardState.Version), out var versionElement)
                ? versionElement.GetInt32()
                : 0;

            if (version == 3)
            {
                var legacy = document.RootElement.Deserialize<DashboardState>(SerializerOptions);
                if (legacy is null || !IsValidLegacyState(legacy))
                    return null;

                if (IsSeededDemo(legacy.Objectives))
                    return null;

                return new DashboardState
                {
                    Version = CurrentVersion,
                    Objectives = legacy.Objectives,
                    SelectedObjectiveId = legacy.SelectedObjectiveId,
                    Gamification = legacy.Gamification
                };
            }

            if (version == 4)
            {
                var legacy = document.RootElement.Deserialize<MultiProfileDashboardState>(SerializerOptions);
                var profile = legacy?.Profiles?.FirstOrDefault(item => item.Id == legacy.ActiveProfileId);
                if (profile is null || !IsValidProfile(profile))
                    return null;

                if (IsSeededDemo(profile.Objectives))
                    return null;

                return new DashboardState
                {
                    Version = CurrentVersion,
                    Objectives = profile.Objectives,
                    SelectedObjectiveId = profile.SelectedObjectiveId,
                    Gamification = profile.Gamification
                };
            }

            var state = document.RootElement.Deserialize<DashboardState>(SerializerOptions);
            if (state is null || !IsValidCurrentState(state))
                return null;
            return state;
        }
        catch (JsonException)
        {
            return null;
        }
        finally
        {
            _gate.Release();
        }
    }

    private static bool IsValidLegacyState(DashboardState state) =>
        state.Objectives is { Count: > 0 }
        && state.Gamification is not null
        && state.Gamification.TotalXp >= 0
        && AreValidObjectives(state.Objectives)
        && state.Objectives.Select(objective => objective.Id).Distinct().Count() == state.Objectives.Count;

    private static bool IsValidCurrentState(DashboardState state) =>
        state.Version == CurrentVersion
        && state.Gamification is not null
        && state.Gamification.TotalXp >= 0
        && state.Objectives is { Count: > 0 }
        && AreValidObjectives(state.Objectives)
        && state.Objectives.Select(objective => objective.Id).Distinct().Count() == state.Objectives.Count;

    private static bool IsValidProfile(LegacyProfile? profile) =>
        profile is not null
        && profile.Id != Guid.Empty
        && !string.IsNullOrWhiteSpace(profile.Name)
        && profile.Gamification is not null
        && profile.Gamification.TotalXp >= 0
        && profile.Objectives is { Count: > 0 }
        && AreValidObjectives(profile.Objectives)
        && profile.Objectives.Select(objective => objective.Id).Distinct().Count() == profile.Objectives.Count;

    private static bool IsSeededDemo(IReadOnlyCollection<Objective> objectives)
    {
        if (objectives.Count != 1)
            return false;

        var objective = objectives.Single();
        var sampleEntries = new Dictionary<string, decimal>(StringComparer.Ordinal)
        {
            ["Venta Barca"] = 500m,
            ["Donación en Twitch"] = 200m,
            ["Super Chat YouTube"] = 50m,
            ["Compra materiales"] = -100m,
            ["Patrocinio local"] = 300m,
            ["Donación anónima"] = 25m,
            ["Venta remera"] = 150m,
            ["Comisión bancaria"] = -75m
        };

        return objective.Title == "VIAJE A JAPÓN ⛩️"
            && objective.Description == "Meta: Recaudación para el viaje"
            && objective.GoalAmount == 10_000m
            && objective.CurrentAmount == 7_350m
            && objective.Entries.Count == sampleEntries.Count
            && objective.Entries.All(entry => sampleEntries.TryGetValue(entry.Description, out var amount) && entry.Amount == amount);
    }

    private static bool AreValidObjectives(IReadOnlyCollection<Objective> objectives) =>
        objectives.All(IsValidObjective);

    private static bool IsValidObjective(Objective? objective) =>
        objective is not null
        && objective.Id != Guid.Empty
        && !string.IsNullOrWhiteSpace(objective.Title)
        && objective.Description is not null
        && objective.GoalAmount > 0
        && objective.UnitId is not null
        && objective.CustomUnitLabel is not null
        && objective.BannerId is not null
        && objective.Entries is not null
        && objective.UnlockedAchievementIds is not null
        && objective.Entries.All(entry => entry is not null && entry.Description is not null)
        && objective.UnlockedAchievementIds.All(id => id is not null);

    private sealed class MultiProfileDashboardState
    {
        public List<LegacyProfile> Profiles { get; set; } = [];

        public Guid ActiveProfileId { get; set; }
    }

    private sealed class LegacyProfile
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public List<Objective> Objectives { get; set; } = [];

        public Guid SelectedObjectiveId { get; set; }

        public GamificationState Gamification { get; set; } = new();
    }

    public async Task SaveAsync(DashboardState state, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(state);
        state.Version = CurrentVersion;

        await _gate.WaitAsync(cancellationToken);
        var temporaryPath = $"{_filePath}.{Guid.NewGuid():N}.tmp";
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);

            await using (var stream = new FileStream(
                temporaryPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                bufferSize: 4096,
                useAsync: true))
            {
                await JsonSerializer.SerializeAsync(stream, state, SerializerOptions, cancellationToken);
                await stream.FlushAsync(cancellationToken);
            }

            File.Move(temporaryPath, _filePath, overwrite: true);
        }
        finally
        {
            try
            {
                if (File.Exists(temporaryPath))
                    File.Delete(temporaryPath);
            }
            catch (IOException)
            {
                // A stale temporary file is preferable to permanently blocking repository access.
            }
            catch (UnauthorizedAccessException)
            {
                // Cleanup is best effort; always release the repository gate.
            }
            finally
            {
                _gate.Release();
            }
        }
    }
}
