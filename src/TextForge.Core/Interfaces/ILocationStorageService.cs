using TextForge.Core.Models;

namespace TextForge.Core.Interfaces;

public interface ILocationStorageService
{
    void EnsureFolder(string locationsPath);
    Task<IReadOnlyList<Location>> GetAllAsync(string locationsPath, CancellationToken ct = default);
    Task<Location> CreateAsync(string locationsPath, string name, CancellationToken ct = default);
    Task<Location?> GetAsync(string locationsPath, Guid id, CancellationToken ct = default);
    Task SaveAsync(string locationsPath, Location location, CancellationToken ct = default);
    Task DeleteAsync(string locationsPath, Guid id, CancellationToken ct = default);
    Task SaveImageAsync(string locationsPath, Guid id, Stream imageStream, string extension, CancellationToken ct = default);
    Task<(Stream Stream, string ContentType)?> GetImageAsync(string locationsPath, Guid id, CancellationToken ct = default);
    void DeleteImage(string locationsPath, Guid id);
    Task ReorderAsync(string locationsPath, IReadOnlyList<Guid> ids, CancellationToken ct = default);
    Task<IReadOnlyList<WorldFolder>> GetFoldersAsync(string locationsPath, CancellationToken ct = default);
    Task SaveFoldersAsync(string locationsPath, IReadOnlyList<WorldFolder> folders, CancellationToken ct = default);
}
