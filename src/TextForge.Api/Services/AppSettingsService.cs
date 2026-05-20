using System.Text.Json;
using TextForge.Api.Interfaces;

namespace TextForge.Api.Services;

public sealed class AppSettingsService : IAppSettingsService
{
    private static readonly string SettingsPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "TextForge", "settings.json");

    private const int MaxRecent = 10;
    private readonly SemaphoreSlim _lock = new(1, 1);

    private static readonly JsonSerializerOptions JsonOpts = new() { WriteIndented = true };

    public async Task<IReadOnlyList<RecentSeriesEntry>> GetRecentSeriesAsync(CancellationToken ct = default)
    {
        var settings = await ReadAsync(ct);
        return settings.RecentSeries;
    }

    public async Task AddRecentSeriesAsync(string title, string path, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var settings = await ReadAsync(ct);
            var recent = settings.RecentSeries
                .Where(r => !r.Path.Equals(path, StringComparison.OrdinalIgnoreCase))
                .Prepend(new RecentSeriesEntry(title, path))
                .Take(MaxRecent)
                .ToList();
            await WriteAsync(settings with { RecentSeries = recent }, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<AiConfig?> GetAiConfigAsync(CancellationToken ct = default)
    {
        var settings = await ReadAsync(ct);
        return settings.AiConfig;
    }

    public async Task SetAiConfigAsync(AiConfig config, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var settings = await ReadAsync(ct);
            await WriteAsync(settings with { AiConfig = config }, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    private static async Task<AppSettings> ReadAsync(CancellationToken ct)
    {
        if (!File.Exists(SettingsPath))
            return new AppSettings();
        try
        {
            var json = await File.ReadAllTextAsync(SettingsPath, ct);
            return JsonSerializer.Deserialize<AppSettings>(json) ?? new AppSettings();
        }
        catch
        {
            return new AppSettings();
        }
    }

    private static async Task WriteAsync(AppSettings settings, CancellationToken ct)
    {
        var dir = Path.GetDirectoryName(SettingsPath)!;
        Directory.CreateDirectory(dir);
        await File.WriteAllTextAsync(SettingsPath, JsonSerializer.Serialize(settings, JsonOpts), ct);
    }

    private sealed record AppSettings
    {
        public List<RecentSeriesEntry> RecentSeries { get; init; } = [];
        public AiConfig? AiConfig { get; init; }
    }
}
