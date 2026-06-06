using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/settings")]
public sealed class SettingsController : ControllerBase
{
    private readonly IAppSettingsService _settings;

    public SettingsController(IAppSettingsService settings) => _settings = settings;

    [HttpGet("recent-series")]
    public async Task<IActionResult> GetRecentSeries(CancellationToken ct)
    {
        var recent = await _settings.GetRecentSeriesAsync(ct);
        return Ok(recent.Select(r => new RecentSeriesDto(r.Title, r.Path)));
    }

    [HttpGet("ui-preferences")]
    public async Task<IActionResult> GetUiPreferences(CancellationToken ct)
    {
        var prefs = await _settings.GetUiPreferencesAsync(ct);
        return Ok(prefs);
    }

    [HttpPut("ui-preferences")]
    public async Task<IActionResult> SetUiPreferences([FromBody] UiPreferences prefs, CancellationToken ct)
    {
        await _settings.SetUiPreferencesAsync(prefs, ct);
        return NoContent();
    }
}

public sealed record RecentSeriesDto(string Title, string Path);
