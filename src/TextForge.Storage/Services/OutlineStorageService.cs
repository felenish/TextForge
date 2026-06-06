using System.Text.Json;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;

namespace TextForge.Storage.Services;

public sealed class OutlineStorageService : IOutlineStorageService
{
    private const string FileExtension = ".tfoutline";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    public void EnsureFolder(string outlinesPath)
        => Directory.CreateDirectory(outlinesPath);

    public async Task<IReadOnlyList<Outline>> GetAllAsync(string outlinesPath, CancellationToken ct = default)
    {
        EnsureFolder(outlinesPath);

        var files = Directory.GetFiles(outlinesPath, $"*{FileExtension}");
        var outlines = new List<Outline>(files.Length);

        foreach (var file in files)
        {
            var outline = await ReadFileAsync(file, ct);
            if (outline is not null)
                outlines.Add(outline);
        }

        outlines.Sort((a, b) => a.SortOrder != b.SortOrder
            ? a.SortOrder.CompareTo(b.SortOrder)
            : string.Compare(a.Name, b.Name, StringComparison.OrdinalIgnoreCase));
        return outlines;
    }

    public async Task<Outline> CreateAsync(string outlinesPath, string name, CancellationToken ct = default)
    {
        EnsureFolder(outlinesPath);

        var existing = await GetAllAsync(outlinesPath, ct);
        var maxOrder = existing.Count > 0 ? existing.Max(o => o.SortOrder) : 0;

        var outline = new Outline
        {
            Id = Guid.NewGuid(),
            Name = name,
            SortOrder = maxOrder + 1,
        };

        await SaveAsync(outlinesPath, outline, ct);
        return outline;
    }

    public async Task<Outline?> GetAsync(string outlinesPath, Guid id, CancellationToken ct = default)
    {
        var path = FilePath(outlinesPath, id);
        if (!File.Exists(path)) return null;
        return await ReadFileAsync(path, ct);
    }

    public async Task SaveAsync(string outlinesPath, Outline outline, CancellationToken ct = default)
    {
        EnsureFolder(outlinesPath);
        var json = JsonSerializer.Serialize(outline, JsonOpts);
        await File.WriteAllTextAsync(FilePath(outlinesPath, outline.Id), json, ct);
    }

    public Task DeleteAsync(string outlinesPath, Guid id, CancellationToken ct = default)
    {
        var path = FilePath(outlinesPath, id);
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }

    public async Task ReorderAsync(string outlinesPath, IReadOnlyList<Guid> ids, CancellationToken ct = default)
    {
        EnsureFolder(outlinesPath);
        for (var i = 0; i < ids.Count; i++)
        {
            var outline = await GetAsync(outlinesPath, ids[i], ct);
            if (outline is null) continue;
            outline.SortOrder = i + 1;
            await SaveAsync(outlinesPath, outline, ct);
        }
    }

    private static string FilePath(string outlinesPath, Guid id)
        => Path.Combine(outlinesPath, $"{id}{FileExtension}");

    private static async Task<Outline?> ReadFileAsync(string path, CancellationToken ct)
    {
        try
        {
            var json = await File.ReadAllTextAsync(path, ct);
            return JsonSerializer.Deserialize<Outline>(json, JsonOpts);
        }
        catch
        {
            return null;
        }
    }
}
