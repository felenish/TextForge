using TextForge.Core.Models;

namespace TextForge.Core.Interfaces;

public interface ICharacterStorageService
{
    void EnsureFolder(string charactersPath);
    Task<IReadOnlyList<Character>> GetAllAsync(string charactersPath, CancellationToken ct = default);
    Task<Character> CreateAsync(string charactersPath, string name, string role, CancellationToken ct = default);
    Task<Character?> GetAsync(string charactersPath, Guid id, CancellationToken ct = default);
    Task SaveAsync(string charactersPath, Character character, CancellationToken ct = default);
    Task DeleteAsync(string charactersPath, Guid id, CancellationToken ct = default);
}
