using ObjectiveReacherMAUI.Models;

namespace ObjectiveReacherMAUI.Services;

public interface IDashboardRepository
{
    Task<DashboardState?> LoadAsync(CancellationToken cancellationToken = default);

    Task SaveAsync(DashboardState state, CancellationToken cancellationToken = default);
}
