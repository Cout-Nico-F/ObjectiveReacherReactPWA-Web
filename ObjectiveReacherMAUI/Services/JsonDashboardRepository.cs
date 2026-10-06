using System.Text.Json;
using Microsoft.Maui.Storage;
using ObjectiveReacherMAUI.Models;

namespace ObjectiveReacherMAUI.Services;

public sealed class JsonDashboardRepository : IDashboardRepository
{
    private const int CurrentVersion = 1;
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

            var state = await JsonSerializer.DeserializeAsync<DashboardState>(stream, SerializerOptions, cancellationToken);
            return state is { Version: CurrentVersion, Objective: not null, Entries: not null }
                ? state
                : null;
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
            if (File.Exists(temporaryPath))
                File.Delete(temporaryPath);

            _gate.Release();
        }
    }
}
