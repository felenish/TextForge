using System.Text.Json;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;

namespace TextForge.Storage.Services;

public sealed class CharacterStorageService : ICharacterStorageService
{
    private const string FileExtension = ".tfcharacter";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    public void EnsureFolder(string charactersPath)
        => Directory.CreateDirectory(charactersPath);

    public async Task<IReadOnlyList<Character>> GetAllAsync(string charactersPath, CancellationToken ct = default)
    {
        EnsureFolder(charactersPath);

        var files = Directory.GetFiles(charactersPath, $"*{FileExtension}");
        var characters = new List<Character>(files.Length);

        foreach (var file in files)
        {
            var character = await ReadFileAsync(file, ct);
            if (character is not null)
                characters.Add(character);
        }

        characters.Sort((a, b) => a.SortOrder != b.SortOrder
            ? a.SortOrder.CompareTo(b.SortOrder)
            : string.Compare(a.Name, b.Name, StringComparison.OrdinalIgnoreCase));
        return characters;
    }

    public async Task<Character> CreateAsync(string charactersPath, string name, string role, CancellationToken ct = default)
    {
        EnsureFolder(charactersPath);

        var existing = await GetAllAsync(charactersPath, ct);
        var maxOrder = existing.Count > 0 ? existing.Max(c => c.SortOrder) : 0;

        var character = new Character
        {
            Id = Guid.NewGuid(),
            Name = name,
            Role = role,
            SortOrder = maxOrder + 1,
        };

        await SaveAsync(charactersPath, character, ct);
        return character;
    }

    public async Task<Character?> GetAsync(string charactersPath, Guid id, CancellationToken ct = default)
    {
        var path = FilePath(charactersPath, id);
        if (!File.Exists(path)) return null;
        return await ReadFileAsync(path, ct);
    }

    public async Task SaveAsync(string charactersPath, Character character, CancellationToken ct = default)
    {
        EnsureFolder(charactersPath);
        var json = JsonSerializer.Serialize(character, JsonOpts);
        await File.WriteAllTextAsync(FilePath(charactersPath, character.Id), json, ct);
    }

    public Task DeleteAsync(string charactersPath, Guid id, CancellationToken ct = default)
    {
        var path = FilePath(charactersPath, id);
        if (File.Exists(path)) File.Delete(path);
        DeleteImage(charactersPath, id);
        return Task.CompletedTask;
    }

    public async Task SaveImageAsync(string charactersPath, Guid id, Stream imageStream, string extension, CancellationToken ct = default)
    {
        DeleteImage(charactersPath, id);
        var dest = Path.Combine(charactersPath, $"{id}{extension}");
        await using var fs = File.Create(dest);
        await imageStream.CopyToAsync(fs, ct);
    }

    public Task<(Stream Stream, string ContentType)?> GetImageAsync(string charactersPath, Guid id, CancellationToken ct = default)
    {
        var file = FindImageFile(charactersPath, id);
        if (file is null) return Task.FromResult<(Stream, string)?>(null);
        var contentType = Path.GetExtension(file).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => "image/jpeg",
        };
        return Task.FromResult<(Stream, string)?>((File.OpenRead(file), contentType));
    }

    public void DeleteImage(string charactersPath, Guid id)
    {
        var file = FindImageFile(charactersPath, id);
        if (file is not null) File.Delete(file);
    }

    public async Task ReorderAsync(string charactersPath, IReadOnlyList<Guid> ids, CancellationToken ct = default)
    {
        EnsureFolder(charactersPath);
        for (var i = 0; i < ids.Count; i++)
        {
            var character = await GetAsync(charactersPath, ids[i], ct);
            if (character is null) continue;
            character.SortOrder = i + 1;
            await SaveAsync(charactersPath, character, ct);
        }
    }

    public async Task<IReadOnlyList<WorldFolder>> GetFoldersAsync(string charactersPath, CancellationToken ct = default)
    {
        EnsureFolder(charactersPath);
        var path = Path.Combine(charactersPath, "_folders.json");
        if (!File.Exists(path)) return [];
        try
        {
            var json = await File.ReadAllTextAsync(path, ct);
            return JsonSerializer.Deserialize<List<WorldFolder>>(json, JsonOpts) ?? [];
        }
        catch { return []; }
    }

    public async Task SaveFoldersAsync(string charactersPath, IReadOnlyList<WorldFolder> folders, CancellationToken ct = default)
    {
        EnsureFolder(charactersPath);
        var path = Path.Combine(charactersPath, "_folders.json");
        var json = JsonSerializer.Serialize(folders, JsonOpts);
        await File.WriteAllTextAsync(path, json, ct);
    }

    private static string? FindImageFile(string charactersPath, Guid id)
    {
        foreach (var ext in new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" })
        {
            var path = Path.Combine(charactersPath, $"{id}{ext}");
            if (File.Exists(path)) return path;
        }
        return null;
    }

    private static string FilePath(string charactersPath, Guid id)
        => Path.Combine(charactersPath, $"{id}{FileExtension}");

    private static async Task<Character?> ReadFileAsync(string path, CancellationToken ct)
    {
        try
        {
            var json = await File.ReadAllTextAsync(path, ct);
            return JsonSerializer.Deserialize<Character>(json, JsonOpts);
        }
        catch
        {
            return null;
        }
    }
}
