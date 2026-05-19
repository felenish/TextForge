namespace TextForge.Api.Interfaces;

public sealed record RecentSeriesEntry(string Title, string Path);

public interface IAppSettingsService
{
    Task<IReadOnlyList<RecentSeriesEntry>> GetRecentSeriesAsync(CancellationToken ct = default);
    Task AddRecentSeriesAsync(string title, string path, CancellationToken ct = default);
}
