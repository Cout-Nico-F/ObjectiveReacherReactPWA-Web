using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Graphics;
using Microsoft.Maui.Storage;
using ObjectiveReacherMAUI.Models;
using ObjectiveReacherMAUI.Services;

namespace ObjectiveReacherMAUI.ViewModels;

public sealed class DashboardViewModel : INotifyPropertyChanged
{
    private readonly IDashboardRepository _repository;
    private readonly SemaphoreSlim _initializationGate = new(1, 1);
    private readonly SemaphoreSlim _stateGate = new(1, 1);
    private readonly List<Objective> _objectives = [];
    private Objective _objective = new();
    private GamificationState _gamification = new();
    private decimal _selectedAmount = 50m;
    private string _customAmountText = string.Empty;
    private int? _selectedQuickAmount = 50;
    private bool _isAddition = true;
    private bool _isBusy;
    private bool _isInitialized;
    private string _newEntryDescription = string.Empty;
    private string _historyFilter = "all";
    private string _persistenceMessage = string.Empty;
    private Guid? _previousObjectiveId;
    private readonly List<string> _recentAchievementUnlocks = [];

    public DashboardViewModel(IDashboardRepository repository)
    {
        _repository = repository;
        HistoryEntries = [];
        ObjectiveTabs = [];
        Achievements = [];
        ApplyState(CreateEmptyState());

        AddModeCommand = new Command(SetAddMode);
        SubtractModeCommand = new Command(SetSubtractMode);
        SelectQuickAmountCommand = new Command<string?>(SelectQuickAmount);
        AddEntryCommand = new Command(async () => await AddEntryAsync(), CanAddEntry);
        SetHistoryFilterCommand = new Command<string?>(SetHistoryFilter);
        SelectObjectiveCommand = new Command<string?>(async id => await SelectObjectiveAsync(id));
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public event EventHandler<DashboardCelebrationEventArgs>? CelebrationRequested;

    public ObservableCollection<EntryRowViewModel> HistoryEntries { get; }

    public ObservableCollection<Objective> ArchivedObjectives { get; } = [];

    public ObservableCollection<ObjectiveTabViewModel> ObjectiveTabs { get; }

    public ObservableCollection<AchievementViewModel> Achievements { get; }

    public ICommand AddModeCommand { get; }

    public ICommand SubtractModeCommand { get; }

    public ICommand SelectQuickAmountCommand { get; }

    public ICommand AddEntryCommand { get; }

    public ICommand SetHistoryFilterCommand { get; }

    public ICommand SelectObjectiveCommand { get; }

    public string SelectedObjectiveId => _objective.Id.ToString();

    public int ActiveObjectiveCount => _objectives.Count(objective => !objective.IsArchived);

    public int ArchivedObjectiveCount => _objectives.Count(objective => objective.IsArchived);

    public Objective CurrentObjective => _objective;

    public bool IsCurrentObjectiveDraft { get; private set; }

    public int ObjectiveCount => ActiveObjectiveCount;

    public int TotalXp => _gamification.TotalXp;

    public int Level => (int)Math.Floor(Math.Sqrt(Math.Max(0, TotalXp) / 100d)) + 1;

    public string ExperienceText => $"Nivel {Level} · {TotalXp} XP";

    public double LevelProgress
    {
        get
        {
            var xpAtLevelStart = 100L * (Level - 1) * (Level - 1);
            var xpForCurrentLevel = 100L * (2L * Level - 1);
            return Math.Clamp((TotalXp - xpAtLevelStart) / (double)xpForCurrentLevel, 0, 1);
        }
    }

    public async Task<bool> ArchiveObjectiveAsync(Guid objectiveId, bool archive, CancellationToken cancellationToken = default)
    {
        await _stateGate.WaitAsync(cancellationToken);
        try
        {
            var objective = _objectives.FirstOrDefault(item => item.Id == objectiveId);
            if (objective is null || objective.IsArchived == archive)
                return false;

            if (archive && !_objectives.Any(item => !item.IsArchived && item.Id != objectiveId))
                return false;

            objective.IsArchived = archive;
            if (archive && _objective.Id == objectiveId)
            {
                _objective = _objectives.First(item => !item.IsArchived);
            }
            else if (!archive && _objective.IsArchived)
            {
                _objective = objective;
            }

            RefreshObjectiveTabs();
            RefreshArchivedObjectives();
            NotifyObjectiveChanged();
            NotifyGamificationChanged();
            await PersistStateAsync(cancellationToken);
            return true;
        }
        finally
        {
            _stateGate.Release();
        }
    }

    public async Task<bool> DeleteObjectiveAsync(Guid objectiveId, CancellationToken cancellationToken = default)
    {
        await _stateGate.WaitAsync(cancellationToken);
        try
        {
            var objective = _objectives.FirstOrDefault(item => item.Id == objectiveId);
            if (objective is null || _objectives.Count(item => !item.IsArchived) <= 1 && !objective.IsArchived)
                return false;

            _gamification.TotalXp = Math.Max(0, _gamification.TotalXp - objective.Entries.Count * 10);
            foreach (var achievementId in objective.UnlockedAchievementIds)
            {
                var achievement = AchievementCatalog.All.FirstOrDefault(item => item.Id == achievementId);
                if (achievement is not null)
                    _gamification.TotalXp = Math.Max(0, _gamification.TotalXp - achievement.RewardXp);
            }
            _objectives.Remove(objective);
            if (_objective.Id == objectiveId)
            {
                _objective = _objectives.FirstOrDefault(item => !item.IsArchived) ?? _objectives[0];
                RefreshAchievements();
                NotifyObjectiveChanged();
                RefreshHistory();
            }

            RefreshObjectiveTabs();
            RefreshArchivedObjectives();
            OnPropertyChanged(nameof(ObjectiveCount));
            OnPropertyChanged(nameof(ActiveObjectiveCount));
            OnPropertyChanged(nameof(ArchivedObjectiveCount));
            NotifyGamificationChanged();
            await PersistStateAsync(cancellationToken);
            return true;
        }
        finally
        {
            _stateGate.Release();
        }
    }

    private void RefreshArchivedObjectives()
    {
        ArchivedObjectives.Clear();
        foreach (var objective in _objectives.Where(item => item.IsArchived))
            ArchivedObjectives.Add(objective);
        OnPropertyChanged(nameof(ArchivedObjectiveCount));
        OnPropertyChanged(nameof(ActiveObjectiveCount));
        OnPropertyChanged(nameof(ObjectiveCount));
    }

    public async Task<bool> DeleteEntryAsync(Guid entryId, CancellationToken cancellationToken = default)
    {
        await _stateGate.WaitAsync(cancellationToken);
        try
        {
            var entry = _objective.Entries.FirstOrDefault(item => item.Id == entryId);
            if (entry is null)
                return false;

            _objective.Entries.Remove(entry);
            _objective.CurrentAmount -= entry.Amount;
            RecalculateGamificationAfterEntryChange(removeEntryReward: true);
            RefreshAfterEntryChange();
            await PersistStateAsync(cancellationToken);
            return true;
        }
        finally
        {
            _stateGate.Release();
        }
    }

    public async Task<bool> EditEntryAsync(Guid entryId, string? description, string? amountText, CancellationToken cancellationToken = default)
    {
        if (!TryParsePositiveAmount(amountText, out var amount))
            return false;

        await _stateGate.WaitAsync(cancellationToken);
        try
        {
            var entry = _objective.Entries.FirstOrDefault(item => item.Id == entryId);
            if (entry is null)
                return false;

            var oldAmount = entry.Amount;
            var sign = oldAmount < 0 ? -1m : 1m;
            var updatedAmount = amount * sign;
            _objective.CurrentAmount += updatedAmount - oldAmount;
            entry.Amount = updatedAmount;
            entry.Description = string.IsNullOrWhiteSpace(description) ? "Entrada" : description.Trim();
            RecalculateGamificationAfterEntryChange(removeEntryReward: false);
            RefreshAfterEntryChange();
            await PersistStateAsync(cancellationToken);
            return true;
        }
        finally
        {
            _stateGate.Release();
        }
    }

    private void RecalculateGamificationAfterEntryChange(bool removeEntryReward)
    {
        if (removeEntryReward)
            _gamification.TotalXp = Math.Max(0, _gamification.TotalXp - 10);
        foreach (var id in _objective.UnlockedAchievementIds)
        {
            var achievement = AchievementCatalog.All.FirstOrDefault(item => item.Id == id);
            if (achievement is not null)
                _gamification.TotalXp = Math.Max(0, _gamification.TotalXp - achievement.RewardXp);
        }

        _objective.UnlockedAchievementIds.Clear();
        _recentAchievementUnlocks.Clear();
        EvaluateObjectiveAchievements();
    }

    private void RefreshAfterEntryChange()
    {
        RefreshAchievements();
        RefreshHistory();
        RefreshObjectiveTabs();
        NotifyObjectiveChanged();
        NotifyGamificationChanged();
    }

    public string LevelProgressText
    {
        get
        {
            var xpAtLevelStart = 100L * (Level - 1) * (Level - 1);
            var xpAtNextLevel = 100L * Level * Level;
            return $"{TotalXp - xpAtLevelStart}/{xpAtNextLevel - xpAtLevelStart} XP para el siguiente nivel";
        }
    }

    public string MascotEmoji => Level switch
    {
        >= 10 => "🐉",
        >= 5 => "🐯",
        >= 2 => "🐱",
        _ => "🌱"
    };

    public string MascotMessage => Level switch
    {
        >= 121 => "¡Leyenda absoluta! Has superado 120 niveles.",
        >= 10 => "¡Eres imparable!",
        >= 5 => "¡Tu esfuerzo está creciendo!",
        >= 2 => "¡Buen comienzo, sigue así!",
        _ => "Cada paso cuenta. ¡Vamos!"
    };

    public int StreakDays => CalculateCurrentStreak();

    public string StreakText => StreakDays == 1 ? "1 día consecutivo" : $"{StreakDays} días consecutivos";

    public string AchievementCountText => $"{_objective.UnlockedAchievementIds.Intersect(AchievementCatalog.All.Select(achievement => achievement.Id)).Count()}/{AchievementCatalog.All.Count} logros";

    public int TotalEntryCount => _objectives.Sum(objective => objective.Entries.Count);

    public string ObjectiveTitle => _objective.Title;

    public string ObjectiveDescription => _objective.Description;

    public decimal GoalAmount => _objective.GoalAmount;

    public string CurrentAmountText => FormatAmount(_objective.CurrentAmount);

    public string GoalAmountText => FormatAmount(_objective.GoalAmount);

    public string ObjectiveUnitId => _objective.UnitId;

    public string CustomUnitLabel => _objective.CustomUnitLabel;

    public IReadOnlyList<ObjectiveUnit> UnitOptions => ObjectiveUnitCatalog.All;

    public ImageSource? BannerImageSource => _objective.BannerId.StartsWith("custom:", StringComparison.Ordinal)
        ? GetCustomBannerSource(_objective.BannerId)
        : _objective.BannerId switch
        {
            "japan" => ImageSource.FromFile("banner_japan.png"),
            "sunset" => ImageSource.FromFile("banner_sunset.png"),
            "forest" => ImageSource.FromFile("banner_forest.png"),
            _ => null
        };

    public double BannerTranslationX => _objective.BannerOffsetX * 60;

    public double BannerTranslationY => _objective.BannerOffsetY * 60;

    public Brush HeroBackground => _objective.BannerId switch
    {
        "japan" => CreateHeroBrush("#392657", "#B9576A"),
        "sunset" => CreateHeroBrush("#45245F", "#F2A56D"),
        "forest" => CreateHeroBrush("#152B3A", "#55776B"),
        _ => CreateHeroBrush("#33294E", "#211D35")
    };

    public string QuickAmount50Text => FormatAmount(50m);

    public string QuickAmount100Text => FormatAmount(100m);

    public string QuickAmount500Text => FormatAmount(500m);

    public string QuickAmount1000Text => FormatAmount(1_000m);

    public Color QuickAmount50Background => QuickAmountBackground(50);

    public Color QuickAmount100Background => QuickAmountBackground(100);

    public Color QuickAmount500Background => QuickAmountBackground(500);

    public Color QuickAmount1000Background => QuickAmountBackground(1000);

    public string HistoryBalanceText => $"Saldo actual: {CurrentAmountText}";

    public double Progress => _objective.GoalAmount <= 0
        ? 0
        : Math.Clamp((double)(_objective.CurrentAmount / _objective.GoalAmount), 0, 1);

    public string ProgressText => $"{Math.Floor(Progress * 100):0}%";

    public string RemainingText => _objective.CurrentAmount >= _objective.GoalAmount
        ? "¡Objetivo completado!"
        : $"Faltan {FormatAmount(_objective.GoalAmount - _objective.CurrentAmount)} para completar el objetivo";

    public decimal SelectedAmount
    {
        get => _selectedAmount;
        private set
        {
            if (SetProperty(ref _selectedAmount, value))
                OnPropertyChanged(nameof(SelectedAmountText));
        }
    }

    public string SelectedAmountText => $"Monto seleccionado: {FormatAmount(SelectedAmount)}";

    public bool HasValidSelectedAmount => _selectedQuickAmount is not null ||
        decimal.TryParse(_customAmountText, NumberStyles.Number, CultureInfo.CurrentCulture, out var amount) && amount > 0 ||
        decimal.TryParse(_customAmountText, NumberStyles.Number, CultureInfo.InvariantCulture, out amount) && amount > 0;

    public string CustomAmountText
    {
        get => _customAmountText;
        set
        {
            if (!SetProperty(ref _customAmountText, value))
                return;

            if (decimal.TryParse(value, NumberStyles.Number, CultureInfo.CurrentCulture, out var amount) ||
                decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out amount))
            {
                if (amount > 0)
                    SelectedAmount = amount;
            }

            UpdateQuickAmountSelection(null);
        }
    }

    public string NewEntryDescription
    {
        get => _newEntryDescription;
        set => SetProperty(ref _newEntryDescription, value);
    }

    public bool IsAddition
    {
        get => _isAddition;
        private set
        {
            if (SetProperty(ref _isAddition, value))
            {
                OnPropertyChanged(nameof(AddModeBackground));
                OnPropertyChanged(nameof(SubtractModeBackground));
            }
        }
    }

    public Color AddModeBackground => Color.FromArgb(IsAddition ? "#23563B" : "#29332F");

    public Color SubtractModeBackground => Color.FromArgb(IsAddition ? "#3B2932" : "#5A2E3B");

    public Color AllFilterBackground => FilterBackground("all");

    public Color AddFilterBackground => FilterBackground("add");

    public Color SubtractFilterBackground => FilterBackground("subtract");

    public string PersistenceMessage
    {
        get => _persistenceMessage;
        private set => SetProperty(ref _persistenceMessage, value);
    }

    public bool IsBusy
    {
        get => _isBusy;
        private set
        {
            if (SetProperty(ref _isBusy, value) && AddEntryCommand is Command command)
                command.ChangeCanExecute();
        }
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        await _initializationGate.WaitAsync(cancellationToken);
        try
        {
            if (_isInitialized)
                return;

            DashboardState? state;
            try
            {
                state = await _repository.LoadAsync(cancellationToken);
            }
            catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
            {
                state = null;
                PersistenceMessage = "No se pudo leer el progreso guardado en este dispositivo.";
            }

            if (state is null)
            {
                ApplyState(CreateEmptyState());
                await PersistStateAsync(cancellationToken);
            }
            else
            {
                ApplyState(state);
            }

            _isInitialized = true;
        }
        finally
        {
            _initializationGate.Release();
        }
    }

    public async Task AddObjectiveAsync(CancellationToken cancellationToken = default)
    {
        await _stateGate.WaitAsync(cancellationToken);
        try
        {
            var previousObjectiveId = _objective.Id;
            _objective = new Objective
            {
                Title = $"Objetivo {_objectives.Count + 1}",
                Description = string.Empty,
                GoalAmount = 1m,
                CustomUnitLabel = "$"
            };
            _previousObjectiveId = _objectives.Any(item => item.Id == previousObjectiveId) ? previousObjectiveId : null;
            _objectives.Add(_objective);
            IsCurrentObjectiveDraft = true;
            _historyFilter = "all";
            RefreshObjectiveTabs();
            NotifyObjectiveChanged();
            RefreshAchievements();
            RefreshHistory();
        }
        finally
        {
            _stateGate.Release();
        }
    }

    public async Task CancelNewObjectiveAsync(CancellationToken cancellationToken = default)
    {
        if (!IsCurrentObjectiveDraft)
            return;

        await _stateGate.WaitAsync(cancellationToken);
        try
        {
            _objectives.Remove(_objective);
            _objective = _previousObjectiveId is Guid previousId
                ? _objectives.FirstOrDefault(item => item.Id == previousId) ?? _objectives.FirstOrDefault() ?? new Objective()
                : _objectives.FirstOrDefault() ?? new Objective();
            IsCurrentObjectiveDraft = false;
            _previousObjectiveId = null;
            _historyFilter = "all";
            RefreshObjectiveTabs();
            RefreshAchievements();
            NotifyObjectiveChanged();
            RefreshHistory();
            await PersistStateAsync(cancellationToken);
        }
        finally
        {
            _stateGate.Release();
        }
    }

    public async Task SelectObjectiveAsync(string? objectiveId, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(objectiveId, out var id))
            return;

        await _stateGate.WaitAsync(cancellationToken);
        try
        {
            var objective = _objectives.FirstOrDefault(item => item.Id == id);
            if (objective is null || objective.Id == _objective.Id)
                return;

            _objective = objective;
            IsCurrentObjectiveDraft = false;
            _previousObjectiveId = null;
            _historyFilter = "all";
            RefreshObjectiveTabs();
            NotifyObjectiveChanged();
            RefreshAchievements();
            RefreshHistory();
            await PersistStateAsync(cancellationToken);
        }
        finally
        {
            _stateGate.Release();
        }
    }

    public async Task<bool> TryUpdateObjectiveAsync(
        string? title,
        string? description,
        string? goalValue,
        string? unitId,
        string? customUnitLabel,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(title) ||
            !decimal.TryParse(goalValue, NumberStyles.Number, CultureInfo.CurrentCulture, out var goal) &&
            !decimal.TryParse(goalValue, NumberStyles.Number, CultureInfo.InvariantCulture, out goal))
            return false;

        if (goal <= 0 || ObjectiveUnitCatalog.Find(unitId) is null ||
            unitId == ObjectiveUnitCatalog.CustomId && string.IsNullOrWhiteSpace(customUnitLabel))
            return false;

        await _stateGate.WaitAsync(cancellationToken);
        try
        {
            _objective.Title = title.Trim();
            _objective.Description = description?.Trim() ?? string.Empty;
            _objective.GoalAmount = goal;
            _objective.UnitId = unitId!;
            _objective.CustomUnitLabel = unitId == ObjectiveUnitCatalog.CustomId
                ? customUnitLabel!.Trim()
                : string.Empty;
            IsCurrentObjectiveDraft = false;
            _previousObjectiveId = null;
            EvaluateObjectiveAchievements();
            RefreshObjectiveTabs();
            RefreshAchievements();
            NotifyObjectiveChanged();
            NotifyGamificationChanged();
            await PersistStateAsync(cancellationToken);
            return true;
        }
        finally
        {
            _stateGate.Release();
        }
    }

    public async Task<bool> TrySetBannerAsync(string bannerId, double offsetX = 0, double offsetY = 0, CancellationToken cancellationToken = default)
    {
        var isPreset = bannerId is "gradient" or "japan" or "sunset" or "forest";
        var customPath = bannerId.StartsWith("custom:", StringComparison.Ordinal)
            ? bannerId["custom:".Length..]
            : string.Empty;
        var isStoredImage = !string.IsNullOrWhiteSpace(customPath) &&
                            !Path.IsPathRooted(customPath) &&
                            !customPath.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar).Contains("..") &&
                            File.Exists(Path.Combine(FileSystem.AppDataDirectory, customPath));
        if (!isPreset && !isStoredImage)
            return false;

        await _stateGate.WaitAsync(cancellationToken);
        try
        {
            _objective.BannerId = bannerId;
            _objective.BannerOffsetX = Math.Clamp(offsetX, -1, 1);
            _objective.BannerOffsetY = Math.Clamp(offsetY, -1, 1);
            NotifyObjectiveChanged();
            await PersistStateAsync(cancellationToken);
            return true;
        }
        finally
        {
            _stateGate.Release();
        }
    }

    private async Task AddEntryAsync(CancellationToken cancellationToken = default)
    {
        await _stateGate.WaitAsync(cancellationToken);
        try
        {
            if (!HasValidSelectedAmount)
            {
                PersistenceMessage = "Escribe un importe mayor que cero o selecciona un acceso rápido.";
                return;
            }

            IsBusy = true;
            var amount = IsAddition ? SelectedAmount : -Math.Min(SelectedAmount, _objective.CurrentAmount);
            var description = string.IsNullOrWhiteSpace(NewEntryDescription)
                ? (IsAddition ? "Aporte" : "Gasto")
                : NewEntryDescription.Trim();

            if (amount == 0)
            {
                PersistenceMessage = "No hay saldo disponible para registrar una resta.";
                return;
            }

            var previousProgress = Progress;
            _objective.CurrentAmount += amount;
            _recentAchievementUnlocks.Clear();
            _objective.Entries.Insert(0, new ObjectiveEntry
            {
                Description = description,
                Amount = amount,
                CreatedAt = DateTimeOffset.Now
            });
            _gamification.TotalXp += 10;
            EvaluateObjectiveAchievements();
            NewEntryDescription = string.Empty;
            PersistenceMessage = string.Empty;
            NotifyObjectiveChanged();
            NotifyGamificationChanged();
            RefreshObjectiveTabs();
            RefreshAchievements();
            RefreshHistory();
            await PersistStateAsync(cancellationToken);
            if (amount > 0 && previousProgress < 1 && Progress >= 1)
                RequestCelebration("¡Objetivo completado!", "¡Lo lograste! Cada paso te trajo hasta aquí.", "🏆", "#E5B945", requiresDismissal: true);
            else if (_recentAchievementUnlocks.Count > 0)
                RequestCelebration("¡Nuevo logro!", string.Join(" · ", _recentAchievementUnlocks), "🏅", "#B58BFF");
            else
                RequestCelebration(amount > 0 ? "¡Buen paso!" : "Entrada registrada", $"+10 XP · {ExperienceText}", "✨", "#65DB85");
        }
        finally
        {
            IsBusy = false;
            _stateGate.Release();
        }
    }

    private void SetAddMode() => IsAddition = true;

    private void SetSubtractMode() => IsAddition = false;

    private void SelectQuickAmount(string? value)
    {
        if (decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) && amount > 0)
        {
            UpdateQuickAmountSelection((int)amount);
            SelectedAmount = amount;
            _customAmountText = string.Empty;
            OnPropertyChanged(nameof(CustomAmountText));
            OnPropertyChanged(nameof(HasValidSelectedAmount));
            (AddEntryCommand as Command)?.ChangeCanExecute();
        }
    }

    private bool CanAddEntry() => !IsBusy && HasValidSelectedAmount;

    private static bool TryParsePositiveAmount(string? value, out decimal amount)
    {
        if ((decimal.TryParse(value, NumberStyles.Number, CultureInfo.CurrentCulture, out amount) ||
             decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out amount)) && amount > 0)
            return true;

        amount = 0;
        return false;
    }

    private void SetHistoryFilter(string? filter)
    {
        if (filter is not ("all" or "add" or "subtract"))
            return;

        _historyFilter = filter;
        OnPropertyChanged(nameof(AllFilterBackground));
        OnPropertyChanged(nameof(AddFilterBackground));
        OnPropertyChanged(nameof(SubtractFilterBackground));
        RefreshHistory();
    }

    private void ApplyState(DashboardState state)
    {
        _objectives.Clear();
        _objectives.AddRange(state.Objectives);
        _gamification = state.Gamification;
        foreach (var objective in _objectives)
        {
            objective.Entries = objective.Entries.OrderByDescending(entry => entry.CreatedAt).ToList();
            _objective = objective;
            EvaluateObjectiveAchievements();
        }
        _objective = _objectives.FirstOrDefault(item => item.Id == state.SelectedObjectiveId && !item.IsArchived)
            ?? _objectives.FirstOrDefault(item => !item.IsArchived)
            ?? _objectives[0];
        IsCurrentObjectiveDraft = false;
        _previousObjectiveId = null;
        RefreshObjectiveTabs();
        RefreshAchievements();
        NotifyObjectiveChanged();
        NotifyGamificationChanged();
        RefreshHistory();
    }

    private void NotifyObjectiveChanged()
    {
        OnPropertyChanged(nameof(ObjectiveTitle));
        OnPropertyChanged(nameof(ObjectiveDescription));
        OnPropertyChanged(nameof(GoalAmount));
        OnPropertyChanged(nameof(SelectedObjectiveId));
        OnPropertyChanged(nameof(ObjectiveCount));
        OnPropertyChanged(nameof(ActiveObjectiveCount));
        OnPropertyChanged(nameof(ArchivedObjectiveCount));
        OnPropertyChanged(nameof(ObjectiveUnitId));
        OnPropertyChanged(nameof(CustomUnitLabel));
        OnPropertyChanged(nameof(BannerImageSource));
        OnPropertyChanged(nameof(BannerTranslationX));
        OnPropertyChanged(nameof(BannerTranslationY));
        OnPropertyChanged(nameof(HeroBackground));
        OnPropertyChanged(nameof(CurrentAmountText));
        OnPropertyChanged(nameof(GoalAmountText));
        OnPropertyChanged(nameof(HistoryBalanceText));
        OnPropertyChanged(nameof(Progress));
        OnPropertyChanged(nameof(ProgressText));
        OnPropertyChanged(nameof(RemainingText));
        OnPropertyChanged(nameof(SelectedAmountText));
        OnPropertyChanged(nameof(QuickAmount50Text));
        OnPropertyChanged(nameof(QuickAmount100Text));
        OnPropertyChanged(nameof(QuickAmount500Text));
        OnPropertyChanged(nameof(QuickAmount1000Text));
        NotifyQuickAmountSelectionChanged();
        OnPropertyChanged(nameof(AchievementCountText));
        OnPropertyChanged(nameof(TotalEntryCount));
    }

    private void RefreshHistory()
    {
        var entries = _historyFilter switch
        {
            "add" => _objective.Entries.Where(entry => entry.Amount > 0),
            "subtract" => _objective.Entries.Where(entry => entry.Amount < 0),
            _ => _objective.Entries
        };

        HistoryEntries.Clear();
        foreach (var entry in entries)
            HistoryEntries.Add(new EntryRowViewModel(entry, _objective));
    }

    private void RefreshObjectiveTabs()
    {
        ObjectiveTabs.Clear();
        foreach (var objective in _objectives.Where(objective => !objective.IsArchived))
            ObjectiveTabs.Add(new ObjectiveTabViewModel(objective.Id, objective.Title, objective.Id == _objective.Id));
    }

    private void RefreshAchievements()
    {
        Achievements.Clear();
        foreach (var achievement in AchievementCatalog.All)
        {
            Achievements.Add(new AchievementViewModel(
                achievement,
                _objective.UnlockedAchievementIds.Contains(achievement.Id)));
        }
        OnPropertyChanged(nameof(AchievementCountText));
    }

    private void EvaluateObjectiveAchievements()
    {
        if (_objective.Entries.Count > 0)
            UnlockAchievement(AchievementCatalog.FirstEntryId);

        var streak = CalculateCurrentStreak();
        if (streak >= 3)
            UnlockAchievement(AchievementCatalog.ThreeDayStreakId);
        if (streak >= 7)
            UnlockAchievement(AchievementCatalog.SevenDayStreakId);

        var progress = _objective.GoalAmount <= 0 ? 0 : _objective.CurrentAmount / _objective.GoalAmount;
        if (progress >= 0.25m)
            UnlockAchievement(AchievementCatalog.Progress25Id);
        if (progress >= 0.5m)
            UnlockAchievement(AchievementCatalog.Progress50Id);
        if (progress >= 1m)
        {
            UnlockAchievement(AchievementCatalog.Progress100Id);
            UnlockAchievement(AchievementCatalog.GoalCompleteId);
        }

        foreach (var achievement in AchievementCatalog.All.Where(item => item.IsSecret))
        {
            if (IsSecretAchievementMet(achievement, progress))
                UnlockAchievement(achievement.Id);
        }
    }

    private bool IsSecretAchievementMet(AchievementDefinition achievement, decimal progress)
    {
        var entries = _objective.Entries;
        return achievement.Condition switch
        {
            AchievementCondition.EntryCount => entries.Count >= achievement.Threshold,
            AchievementCondition.StreakDays => CalculateCurrentStreak() >= achievement.Threshold,
            AchievementCondition.ProgressPercent => progress * 100m >= achievement.Threshold,
            AchievementCondition.LargestContributionPercent => _objective.GoalAmount > 0 &&
                entries.Where(entry => entry.Amount > 0).Select(entry => entry.Amount).DefaultIfEmpty(0).Max() / _objective.GoalAmount * 100m >= achievement.Threshold,
            AchievementCondition.WeekendEntryCount => entries.Count(entry => entry.CreatedAt.LocalDateTime.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) >= achievement.Threshold,
            AchievementCondition.EarlyEntryCount => entries.Count(entry => entry.CreatedAt.LocalDateTime.Hour < 8) >= achievement.Threshold,
            AchievementCondition.LateEntryCount => entries.Count(entry => entry.CreatedAt.LocalDateTime.Hour >= 21) >= achievement.Threshold,
            _ => false
        };
    }

    private void UnlockAchievement(string achievementId)
    {
        if (_objective.UnlockedAchievementIds.Contains(achievementId))
            return;

        _objective.UnlockedAchievementIds.Add(achievementId);
        var achievement = AchievementCatalog.All.First(item => item.Id == achievementId);
        _gamification.TotalXp += achievement.RewardXp;
        _recentAchievementUnlocks.Add(achievement.Title);
    }

    private void RequestCelebration(string title, string message, string emoji, string color, bool requiresDismissal = false) =>
        CelebrationRequested?.Invoke(this, new DashboardCelebrationEventArgs(title, message, emoji, color, requiresDismissal));

    private int CalculateCurrentStreak()
    {
        var activeDays = _objectives
            .SelectMany(objective => objective.Entries)
            .Select(entry => DateOnly.FromDateTime(entry.CreatedAt.LocalDateTime))
            .ToHashSet();

        var day = DateOnly.FromDateTime(DateTime.Now);
        if (!activeDays.Contains(day))
            day = day.AddDays(-1);

        var streak = 0;
        while (activeDays.Contains(day))
        {
            streak++;
            day = day.AddDays(-1);
        }
        return streak;
    }

    private void NotifyGamificationChanged()
    {
        OnPropertyChanged(nameof(TotalXp));
        OnPropertyChanged(nameof(Level));
        OnPropertyChanged(nameof(ExperienceText));
        OnPropertyChanged(nameof(LevelProgress));
        OnPropertyChanged(nameof(LevelProgressText));
        OnPropertyChanged(nameof(MascotEmoji));
        OnPropertyChanged(nameof(MascotMessage));
        OnPropertyChanged(nameof(StreakDays));
        OnPropertyChanged(nameof(StreakText));
    }

    private async Task PersistStateAsync(CancellationToken cancellationToken)
    {
        var state = new DashboardState
        {
            Objectives = _objectives.Select(CloneObjective).ToList(),
            SelectedObjectiveId = _objective.Id,
            Gamification = new GamificationState { TotalXp = _gamification.TotalXp }
        };

        try
        {
            await _repository.SaveAsync(state, cancellationToken);
            PersistenceMessage = string.Empty;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            PersistenceMessage = "No se pudo guardar el progreso. Los cambios podrían perderse al cerrar la app.";
        }
    }

    private static Objective CloneObjective(Objective objective) => new()
    {
        Id = objective.Id,
        Title = objective.Title,
        Description = objective.Description,
        GoalAmount = objective.GoalAmount,
        CurrentAmount = objective.CurrentAmount,
        UnitId = objective.UnitId,
        CustomUnitLabel = objective.CustomUnitLabel,
        BannerId = objective.BannerId,
        BannerOffsetX = objective.BannerOffsetX,
        BannerOffsetY = objective.BannerOffsetY,
        IsArchived = objective.IsArchived,
        Entries = objective.Entries.Select(entry => new ObjectiveEntry
        {
            Id = entry.Id,
            Description = entry.Description,
            Amount = entry.Amount,
            CreatedAt = entry.CreatedAt
        }).ToList(),
        UnlockedAchievementIds = [.. objective.UnlockedAchievementIds]
    };

    private Color QuickAmountBackground(int amount) =>
        Color.FromArgb(_selectedQuickAmount == amount ? "#604094" : "#29283D");

    private void UpdateQuickAmountSelection(int? quickAmount)
    {
        _selectedQuickAmount = quickAmount;
        NotifyQuickAmountSelectionChanged();
    }

    private void NotifyQuickAmountSelectionChanged()
    {
        OnPropertyChanged(nameof(QuickAmount50Background));
        OnPropertyChanged(nameof(QuickAmount100Background));
        OnPropertyChanged(nameof(QuickAmount500Background));
        OnPropertyChanged(nameof(QuickAmount1000Background));
    }

    private Color FilterBackground(string filter) => Color.FromArgb(_historyFilter == filter ? "#604094" : "#252437");

    private static ImageSource? GetCustomBannerSource(string bannerId)
    {
        var relativePath = bannerId["custom:".Length..];
        var path = Path.Combine(FileSystem.AppDataDirectory, relativePath);
        return File.Exists(path) ? ImageSource.FromFile(path) : null;
    }


    private static LinearGradientBrush CreateHeroBrush(string start, string end) => new()
    {
        StartPoint = new Point(0, 0),
        EndPoint = new Point(1, 1),
        GradientStops =
        {
            new GradientStop(Color.FromArgb(start), 0),
            new GradientStop(Color.FromArgb(end), 1)
        }
    };

    private static DashboardState CreateEmptyState()
    {
        var objective = new Objective
        {
            Title = "Mi objetivo",
            GoalAmount = 1m
        };
        return new DashboardState
        {
            Objectives = [objective],
            SelectedObjectiveId = objective.Id,
            Gamification = new GamificationState()
        };
    }

    private string FormatAmount(decimal amount) => ObjectiveAmountFormatter.Format(amount, _objective);

    private bool SetProperty<T>(ref T backingStore, T value, [CallerMemberName] string? propertyName = null)
    {
        if (EqualityComparer<T>.Default.Equals(backingStore, value))
            return false;

        backingStore = value;
        OnPropertyChanged(propertyName);
        return true;
    }

    private void OnPropertyChanged([CallerMemberName] string? propertyName = null) =>
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
}
