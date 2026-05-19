using TextForge.Core.Models;

namespace TextForge.Core.Interfaces;

public interface IOutlineStorageService
{
    void EnsureFolder(string outlinesPath);
    Task<IReadOnlyList<Outline>> GetAllAsync(string outlinesPath, CancellationToken ct = default);
    Task<Outline> CreateAsync(string outlinesPath, string name, CancellationToken ct = default);
    Task<Outline?> GetAsync(string outlinesPath, Guid id, CancellationToken ct = default);
    Task SaveAsync(string outlinesPath, Outline outline, CancellationToken ct = default);
    Task DeleteAsync(string outlinesPath, Guid id, CancellationToken ct = default);
}
