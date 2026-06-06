using TextForge.Core.Models;

namespace TextForge.Core.Interfaces;

public interface IPlotGridStorageService
{
    void EnsureFolder(string plotGridsPath);
    Task<IReadOnlyList<PlotGrid>> GetAllAsync(string plotGridsPath, CancellationToken ct = default);
    Task<PlotGrid> CreateAsync(string plotGridsPath, string name, CancellationToken ct = default);
    Task<PlotGrid?> GetAsync(string plotGridsPath, Guid id, CancellationToken ct = default);
    Task SaveAsync(string plotGridsPath, PlotGrid plotGrid, CancellationToken ct = default);
    Task DeleteAsync(string plotGridsPath, Guid id, CancellationToken ct = default);
    Task ReorderAsync(string plotGridsPath, IReadOnlyList<Guid> ids, CancellationToken ct = default);
}
