using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Globalization;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using Microsoft.Maui.Controls;
using Microsoft.Maui.Graphics;
using ObjectiveReacherMAUI.Models;
using ObjectiveReacherMAUI.Services;

namespace ObjectiveReacherMAUI.ViewModels;

public sealed class DashboardViewModel : INotifyPropertyChanged
{
    private readonly IDashboardRepository _repository;
    private readonly SemaphoreSlim _initializationGate = new(1, 1);
    private readonly SemaphoreSlim _stateGate = new(1, 1);
    private readonly List<ObjectiveEntry> _entries = [];
    private Objective _objective = new();
    private decimal _selectedAmount = 50m;
    private bool _isAddition = true;
    private bool _isBusy;
    private bool _isInitialized;
    private string _newEntryDescription = string.Empty;
    private string _historyFilter = "all";
    private string _persistenceMessage = string.Empty;

    public DashboardViewModel(IDashboardRepository repository)
    {
        _repository = repository;
        HistoryEntries = [];
        ApplyState(CreateSampleState());

        AddModeCommand = new Command(SetAddMode);
        SubtractModeCommand = new Command(SetSubtractMode);
        SelectQuickAmountCommand = new Command<string?>(SelectQuickAmount);
        AddEntryCommand = new Command(async () => await AddEntryAsync(), () => !IsBusy);
        SetHistoryFilterCommand = new Command<string?>(SetHistoryFilter);
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    public ObservableCollection<EntryRowViewModel> HistoryEntries { get; }

    public ICommand AddModeCommand { get; }

    public ICommand SubtractModeCommand { get; }

    public ICommand SelectQuickAmountCommand { get; }

    public ICommand AddEntryCommand { get; }

    public ICommand SetHistoryFilterCommand { get; }

    public string ObjectiveTitle => _objective.Title;

    public string ObjectiveDescription => _objective.Description;

    public decimal GoalAmount => _objective.GoalAmount;

    public string CurrentAmountText => FormatCurrency(_objective.CurrentAmount);

    public string GoalAmountText => FormatCurrency(_objective.GoalAmount);

    public string HistoryBalanceText => $"Saldo actual: {CurrentAmountText}";

    public double Progress => _objective.GoalAmount <= 0
        ? 0
        : Math.Clamp((double)(_objective.CurrentAmount / _objective.GoalAmount), 0, 1);

    public string ProgressText => $"{Math.Floor(Progress * 100):0}%";

    public string RemainingText => _objective.CurrentAmount >= _objective.GoalAmount
        ? "¡Objetivo completado!"
        : $"Faltan {FormatCurrency(_objective.GoalAmount - _objective.CurrentAmount)} para completar el objetivo";

    public decimal SelectedAmount
    {
        get => _selectedAmount;
        private set
        {
            if (SetProperty(ref _selectedAmount, value))
                OnPropertyChanged(nameof(SelectedAmountText));
        }
    }

    public string SelectedAmountText => $"Monto seleccionado: {FormatCurrency(SelectedAmount)}";

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
                ApplyState(CreateSampleState());
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

    public async Task<bool> TrySetGoalAsync(string? value, CancellationToken cancellationToken = default)
    {
        if (!decimal.TryParse(value, NumberStyles.Number, CultureInfo.CurrentCulture, out var goal) &&
            !decimal.TryParse(value, NumberStyles.Number, CultureInfo.InvariantCulture, out goal))
            return false;

        if (goal <= 0)
            return false;

        await _stateGate.WaitAsync(cancellationToken);
        try
        {
            _objective.GoalAmount = goal;
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

            _objective.CurrentAmount += amount;
            _entries.Insert(0, new ObjectiveEntry
            {
                Description = description,
                Amount = amount,
                CreatedAt = DateTimeOffset.Now
            });
            NewEntryDescription = string.Empty;
            PersistenceMessage = string.Empty;
            NotifyObjectiveChanged();
            RefreshHistory();
            await PersistStateAsync(cancellationToken);
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
            SelectedAmount = amount;
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
        _objective = state.Objective;
        _entries.Clear();
        _entries.AddRange(state.Entries.OrderByDescending(entry => entry.CreatedAt));
        NotifyObjectiveChanged();
        RefreshHistory();
    }

    private void NotifyObjectiveChanged()
    {
        OnPropertyChanged(nameof(ObjectiveTitle));
        OnPropertyChanged(nameof(ObjectiveDescription));
        OnPropertyChanged(nameof(GoalAmount));
        OnPropertyChanged(nameof(CurrentAmountText));
        OnPropertyChanged(nameof(GoalAmountText));
        OnPropertyChanged(nameof(HistoryBalanceText));
        OnPropertyChanged(nameof(Progress));
        OnPropertyChanged(nameof(ProgressText));
        OnPropertyChanged(nameof(RemainingText));
    }

    private void RefreshHistory()
    {
        var entries = _historyFilter switch
        {
            "add" => _entries.Where(entry => entry.Amount > 0),
            "subtract" => _entries.Where(entry => entry.Amount < 0),
            _ => _entries
        };

        HistoryEntries.Clear();
        foreach (var entry in entries)
            HistoryEntries.Add(new EntryRowViewModel(entry));
    }

    private async Task PersistStateAsync(CancellationToken cancellationToken)
    {
        var state = new DashboardState
        {
            Objective = new Objective
            {
                Title = _objective.Title,
                Description = _objective.Description,
                GoalAmount = _objective.GoalAmount,
                CurrentAmount = _objective.CurrentAmount
            },
            Entries = _entries.Select(entry => new ObjectiveEntry
            {
                Id = entry.Id,
                Description = entry.Description,
                Amount = entry.Amount,
                CreatedAt = entry.CreatedAt
            }).ToList()
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

    private Color FilterBackground(string filter) => Color.FromArgb(_historyFilter == filter ? "#604094" : "#252437");

    private static DashboardState CreateSampleState()
    {
        var now = DateTimeOffset.Now;
        return new DashboardState
        {
            Objective = new Objective
            {
                Title = "VIAJE A JAPÓN ⛩️",
                Description = "Meta: Recaudación para el viaje",
                GoalAmount = 10_000m,
                CurrentAmount = 7_350m
            },
            Entries =
            [
                new() { Description = "Venta Barca", Amount = 500m, CreatedAt = now.AddMinutes(-10) },
                new() { Description = "Donación en Twitch", Amount = 200m, CreatedAt = now.AddMinutes(-90) },
                new() { Description = "Super Chat YouTube", Amount = 50m, CreatedAt = now.AddHours(-3) },
                new() { Description = "Compra materiales", Amount = -100m, CreatedAt = now.AddDays(-1).AddHours(-2) },
                new() { Description = "Patrocinio local", Amount = 300m, CreatedAt = now.AddDays(-1).AddHours(-4) },
                new() { Description = "Donación anónima", Amount = 25m, CreatedAt = now.AddDays(-1).AddHours(-8) },
                new() { Description = "Venta remera", Amount = 150m, CreatedAt = now.AddDays(-2) },
                new() { Description = "Comisión bancaria", Amount = -75m, CreatedAt = now.AddDays(-2).AddMinutes(-30) }
            ]
        };
    }

    private static string FormatCurrency(decimal amount) => $"${amount.ToString("N0", CultureInfo.CurrentCulture)}";

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
