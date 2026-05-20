namespace TextForge.Api.Interfaces;

public sealed record RecentSeriesEntry(string Title, string Path);

public sealed record AiConfig(string BaseUrl, string ApiKey, string Model);

public interface IAppSettingsService
{
    Task<IReadOnlyList<RecentSeriesEntry>> GetRecentSeriesAsync(CancellationToken ct = default);
    Task AddRecentSeriesAsync(string title, string path, CancellationToken ct = default);

    Task<AiConfig?> GetAiConfigAsync(CancellationToken ct = default);
    Task SetAiConfigAsync(AiConfig config, CancellationToken ct = default);
}
