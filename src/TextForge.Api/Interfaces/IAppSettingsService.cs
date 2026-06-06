namespace TextForge.Api.Interfaces;

public sealed record RecentSeriesEntry(string Title, string Path);

public sealed record AiConfig(string BaseUrl, string ApiKey, string Model);

public sealed record UiPreferences
{
    public string Theme { get; init; } = "dark";
    public bool TypewriterMode { get; init; } = false;
    public bool InspectorOpen { get; init; } = true;
    public bool MinimapOpen { get; init; } = false;
    public bool BottomOpen { get; init; } = false;
    public string EditorFont { get; init; } = "serif";
    public int FontSize { get; init; } = 17;
    public double LineHeight { get; init; } = 1.7;
    public double ParagraphIndent { get; init; } = 0;
    public int AutosaveInterval { get; init; } = 15;
    public int DailyGoal { get; init; } = 0;
    public int ProjectGoal { get; init; } = 0;
    public DailyProgress? DailyProgress { get; init; }
    public string? LastSeriesPath { get; init; }
}

public sealed record DailyProgress(string Date, int Written);

public interface IAppSettingsService
{
    Task<IReadOnlyList<RecentSeriesEntry>> GetRecentSeriesAsync(CancellationToken ct = default);
    Task AddRecentSeriesAsync(string title, string path, CancellationToken ct = default);

    Task<AiConfig?> GetAiConfigAsync(CancellationToken ct = default);
    Task SetAiConfigAsync(AiConfig config, CancellationToken ct = default);

    Task<UiPreferences> GetUiPreferencesAsync(CancellationToken ct = default);
    Task SetUiPreferencesAsync(UiPreferences prefs, CancellationToken ct = default);
}
