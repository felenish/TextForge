using System.Text.Json;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;

namespace TextForge.Storage.Services;

public sealed class LocationStorageService : ILocationStorageService
{
    private const string FileExtension = ".tflocation";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    public void EnsureFolder(string locationsPath)
        => Directory.CreateDirectory(locationsPath);

    public async Task<IReadOnlyList<Location>> GetAllAsync(string locationsPath, CancellationToken ct = default)
    {
        EnsureFolder(locationsPath);

        var files = Directory.GetFiles(locationsPath, $"*{FileExtension}");
        var locations = new List<Location>(files.Length);

        foreach (var file in files)
        {
            var location = await ReadFileAsync(file, ct);
            if (location is not null)
                locations.Add(location);
        }

        locations.Sort((a, b) => string.Compare(a.Name, b.Name, StringComparison.OrdinalIgnoreCase));
        return locations;
    }

    public async Task<Location> CreateAsync(string locationsPath, string name, CancellationToken ct = default)
    {
        EnsureFolder(locationsPath);

        var location = new Location
        {
            Id = Guid.NewGuid(),
            Name = name,
        };

        await SaveAsync(locationsPath, location, ct);
        return location;
    }

    public async Task<Location?> GetAsync(string locationsPath, Guid id, CancellationToken ct = default)
    {
        var path = FilePath(locationsPath, id);
        if (!File.Exists(path)) return null;
        return await ReadFileAsync(path, ct);
    }

    public async Task SaveAsync(string locationsPath, Location location, CancellationToken ct = default)
    {
        EnsureFolder(locationsPath);
        var json = JsonSerializer.Serialize(location, JsonOpts);
        await File.WriteAllTextAsync(FilePath(locationsPath, location.Id), json, ct);
    }

    public Task DeleteAsync(string locationsPath, Guid id, CancellationToken ct = default)
    {
        var path = FilePath(locationsPath, id);
        if (File.Exists(path)) File.Delete(path);
        DeleteImage(locationsPath, id);
        return Task.CompletedTask;
    }

    public async Task SaveImageAsync(string locationsPath, Guid id, Stream imageStream, string extension, CancellationToken ct = default)
    {
        DeleteImage(locationsPath, id);
        var dest = Path.Combine(locationsPath, $"{id}{extension}");
        await using var fs = File.Create(dest);
        await imageStream.CopyToAsync(fs, ct);
    }

    public Task<(Stream Stream, string ContentType)?> GetImageAsync(string locationsPath, Guid id, CancellationToken ct = default)
    {
        var file = FindImageFile(locationsPath, id);
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

    public void DeleteImage(string locationsPath, Guid id)
    {
        var file = FindImageFile(locationsPath, id);
        if (file is not null) File.Delete(file);
    }

    private static string? FindImageFile(string locationsPath, Guid id)
    {
        foreach (var ext in new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" })
        {
            var path = Path.Combine(locationsPath, $"{id}{ext}");
            if (File.Exists(path)) return path;
        }
        return null;
    }

    private static string FilePath(string locationsPath, Guid id)
        => Path.Combine(locationsPath, $"{id}{FileExtension}");

    private static async Task<Location?> ReadFileAsync(string path, CancellationToken ct)
    {
        try
        {
            var json = await File.ReadAllTextAsync(path, ct);
            return JsonSerializer.Deserialize<Location>(json, JsonOpts);
        }
        catch
        {
            return null;
        }
    }
}
