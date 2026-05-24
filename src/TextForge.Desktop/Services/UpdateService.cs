using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Text.Json;

namespace TextForge.Desktop.Services;

public sealed record UpdateInfo(string Version, string DownloadUrl);

public static class UpdateService
{
    private static readonly HttpClient _http = new()
    {
        DefaultRequestHeaders = { { "User-Agent", "TextForge-Studio-Updater/1.0" } },
        Timeout = TimeSpan.FromSeconds(20),
    };

    private const string Repo = "felenish/TextForge";

    public static string CurrentVersion =>
        FileVersionInfo
            .GetVersionInfo(System.Reflection.Assembly.GetExecutingAssembly().Location)
            .FileVersion ?? "0.0.0.0";

    /// <summary>
    /// Checks GitHub releases for a version newer than the running build.
    /// Returns null on any error (no internet, rate limit, parse failure, etc.).
    /// </summary>
    public static async Task<UpdateInfo?> CheckAsync()
    {
        try
        {
            var json = await _http.GetStringAsync(
                $"https://api.github.com/repos/{Repo}/releases");

            using var doc = JsonDocument.Parse(json);
            // /releases/latest returns 404 when the newest release is a draft, so we
            // fetch the list and pick the first published, non-prerelease entry instead.
            JsonElement? match = null;
            foreach (var rel in doc.RootElement.EnumerateArray())
            {
                if (!rel.GetProperty("draft").GetBoolean() &&
                    !rel.GetProperty("prerelease").GetBoolean())
                {
                    match = rel;
                    break;
                }
            }
            if (match is not { } root) { return null; }

            var tag = root.GetProperty("tag_name").GetString()?.TrimStart('v') ?? "";
            if (!Version.TryParse(tag, out var latest)) return null;
            if (!Version.TryParse(CurrentVersion, out var current)) return null;
            if (latest <= current) return null;

            foreach (var asset in root.GetProperty("assets").EnumerateArray())
            {
                var name = asset.GetProperty("name").GetString() ?? "";
                var url  = asset.GetProperty("browser_download_url").GetString() ?? "";
                if (name.EndsWith(".exe", StringComparison.OrdinalIgnoreCase) && url.Length > 0)
                    return new UpdateInfo(tag, url);
            }
            return null;
        }
        catch (Exception ex)
        {
            return null;
        }
    }

    /// <summary>
    /// Downloads the installer to %TEMP%. Re-uses an existing file with the same name.
    /// Reports integer percent progress if a receiver is provided.
    /// </summary>
    public static async Task<string> DownloadAsync(
        UpdateInfo info,
        IProgress<int>? progress = null)
    {
        var dest = Path.Combine(
            Path.GetTempPath(),
            $"TextForge-{info.Version}-win-x64-Setup.exe");

        if (File.Exists(dest)) return dest;

        using var response = await _http.GetAsync(
            info.DownloadUrl,
            HttpCompletionOption.ResponseHeadersRead);
        response.EnsureSuccessStatusCode();

        var total = response.Content.Headers.ContentLength ?? -1L;
        await using var src = await response.Content.ReadAsStreamAsync();
        await using var dst = File.Create(dest);

        var buf = new byte[81_920];
        long done = 0;
        int read;
        while ((read = await src.ReadAsync(buf)) > 0)
        {
            await dst.WriteAsync(buf.AsMemory(0, read));
            done += read;
            if (total > 0)
                progress?.Report((int)(done * 100 / total));
        }
        return dest;
    }

    public static void LaunchInstaller(string path) =>
        Process.Start(new ProcessStartInfo
        {
            FileName        = path,
            Arguments       = "/SILENT /CLOSEAPPLICATIONS",
            UseShellExecute = true,
        });
}
