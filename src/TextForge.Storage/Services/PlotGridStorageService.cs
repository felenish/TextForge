using System.Text.Json;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;

namespace TextForge.Storage.Services;

public sealed class PlotGridStorageService : IPlotGridStorageService
{
    private const string FileExtension = ".tfplotgrid";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    public void EnsureFolder(string plotGridsPath)
        => Directory.CreateDirectory(plotGridsPath);

    public async Task<IReadOnlyList<PlotGrid>> GetAllAsync(string plotGridsPath, CancellationToken ct = default)
    {
        EnsureFolder(plotGridsPath);

        var files = Directory.GetFiles(plotGridsPath, $"*{FileExtension}");
        var grids = new List<PlotGrid>(files.Length);

        foreach (var file in files)
        {
            var grid = await ReadFileAsync(file, ct);
            if (grid is not null)
                grids.Add(grid);
        }

        grids.Sort((a, b) => string.Compare(a.Name, b.Name, StringComparison.OrdinalIgnoreCase));
        return grids;
    }

    public async Task<PlotGrid> CreateAsync(string plotGridsPath, string name, CancellationToken ct = default)
    {
        EnsureFolder(plotGridsPath);

        var grid = new PlotGrid
        {
            Id = Guid.NewGuid(),
            Name = name,
            Columns =
            [
                new PlotGridColumn { Id = Guid.NewGuid().ToString(), Label = "Main Plot" },
                new PlotGridColumn { Id = Guid.NewGuid().ToString(), Label = "Character Arc" },
                new PlotGridColumn { Id = Guid.NewGuid().ToString(), Label = "Subplot" },
            ],
            Rows =
            [
                new PlotGridRow { Id = Guid.NewGuid().ToString(), Label = "Chapter 1" },
                new PlotGridRow { Id = Guid.NewGuid().ToString(), Label = "Chapter 2" },
                new PlotGridRow { Id = Guid.NewGuid().ToString(), Label = "Chapter 3" },
            ],
        };

        await SaveAsync(plotGridsPath, grid, ct);
        return grid;
    }

    public async Task<PlotGrid?> GetAsync(string plotGridsPath, Guid id, CancellationToken ct = default)
    {
        var path = FilePath(plotGridsPath, id);
        if (!File.Exists(path)) return null;
        return await ReadFileAsync(path, ct);
    }

    public async Task SaveAsync(string plotGridsPath, PlotGrid plotGrid, CancellationToken ct = default)
    {
        EnsureFolder(plotGridsPath);
        var json = JsonSerializer.Serialize(plotGrid, JsonOpts);
        await File.WriteAllTextAsync(FilePath(plotGridsPath, plotGrid.Id), json, ct);
    }

    public Task DeleteAsync(string plotGridsPath, Guid id, CancellationToken ct = default)
    {
        var path = FilePath(plotGridsPath, id);
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }

    private static string FilePath(string plotGridsPath, Guid id)
        => Path.Combine(plotGridsPath, $"{id}{FileExtension}");

    private static async Task<PlotGrid?> ReadFileAsync(string path, CancellationToken ct)
    {
        try
        {
            var json = await File.ReadAllTextAsync(path, ct);
            return JsonSerializer.Deserialize<PlotGrid>(json, JsonOpts);
        }
        catch
        {
            return null;
        }
    }
}
