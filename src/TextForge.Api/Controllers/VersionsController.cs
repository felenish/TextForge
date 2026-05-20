using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;
using TextForge.Versioning.Exceptions;
using TextForge.Versioning.Interfaces;
using TextForge.Versioning.Models;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/versions")]
public sealed class VersionsController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;
    private readonly IBookStorageService _bookStorage;
    private readonly IVersioningService _versioning;

    public VersionsController(
        ISeriesWorkspaceService workspace,
        IBookStorageService bookStorage,
        IVersioningService versioning)
    {
        _workspace = workspace;
        _bookStorage = bookStorage;
        _versioning = versioning;
    }

    // GET /api/versions/status
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var branch = await _versioning.GetCurrentBranchAsync(series.RootPath, ct);
        var latest = await _versioning.GetLatestSnapshotAsync(series.RootPath, ct);

        return Ok(new VersionStatusDto(branch, latest is null ? null : ToSummary(latest)));
    }

    // POST /api/versions/snapshots
    [HttpPost("snapshots")]
    public async Task<IActionResult> TakeSnapshot([FromBody] TakeSnapshotBody body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Label))
            return BadRequest(new ErrorDto("Snapshot label is required."));

        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var contents = await GatherSceneContentsAsync(series, ct);
        if (contents.Count == 0)
            return BadRequest(new ErrorDto("No scenes found to snapshot."));

        var snapshot = await _versioning.TakeSnapshotAsync(
            series.RootPath, body.Label, contents, body.Message ?? string.Empty, ct);

        return CreatedAtAction(nameof(GetSnapshot), new { id = snapshot.Id }, ToSummary(snapshot));
    }

    // GET /api/versions/snapshots?branch=&limit=&offset=
    [HttpGet("snapshots")]
    public async Task<IActionResult> GetSnapshots(
        [FromQuery] string? branch,
        [FromQuery] int limit = 30,
        [FromQuery] int offset = 0,
        CancellationToken ct = default)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        limit = Math.Clamp(limit, 1, 100);
        offset = Math.Max(0, offset);

        // Fetch enough to determine HasMore
        var all = await _versioning.GetHistoryAsync(series.RootPath, branch, limit + offset + 1, ct);
        var page = all.Skip(offset).Take(limit).Select(ToSummary).ToList();
        var hasMore = all.Count > offset + limit;

        return Ok(new SnapshotListDto(page, hasMore));
    }

    // GET /api/versions/snapshots/{id}
    [HttpGet("snapshots/{id:guid}")]
    public async Task<IActionResult> GetSnapshot(Guid id, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var snapshot = await _versioning.GetSnapshotAsync(series.RootPath, id, ct);
        if (snapshot is null)
            return NotFound(new ErrorDto($"Snapshot {id} not found."));

        var diff = await _versioning.GetSnapshotDiffAsync(series.RootPath, id, ct);
        var titleLookup = BuildSceneTitleLookup(series);

        var changes = BuildChangeList(diff, titleLookup);
        return Ok(new SnapshotDetailDto(
            snapshot.Id, snapshot.Label, snapshot.Message,
            snapshot.TimestampUtc, snapshot.Branch, snapshot.ParentId, changes));
    }

    // GET /api/versions/branches
    [HttpGet("branches")]
    public async Task<IActionResult> GetBranches(CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var branches = await _versioning.GetBranchesAsync(series.RootPath, ct);
        var dtos = new List<BranchDto>(branches.Count);

        foreach (var b in branches)
        {
            SnapshotSummaryDto? tip = null;
            if (b.TipSnapshotId is not null)
            {
                var snap = await _versioning.GetSnapshotAsync(series.RootPath, b.TipSnapshotId.Value, ct);
                if (snap is not null)
                    tip = ToSummary(snap);
            }
            dtos.Add(new BranchDto(b.Name, b.IsCurrent, tip));
        }

        return Ok(dtos);
    }

    // POST /api/versions/branches
    [HttpPost("branches")]
    public async Task<IActionResult> CreateBranch([FromBody] CreateBranchBody body, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        try
        {
            var branch = await _versioning.CreateBranchAsync(
                series.RootPath, body.Name, body.FromSnapshotId, ct);

            SnapshotSummaryDto? tip = null;
            if (branch.TipSnapshotId is not null)
            {
                var snap = await _versioning.GetSnapshotAsync(series.RootPath, branch.TipSnapshotId.Value, ct);
                if (snap is not null)
                    tip = ToSummary(snap);
            }
            return Ok(new BranchDto(branch.Name, false, tip));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorDto(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ErrorDto(ex.Message));
        }
    }

    // PUT /api/versions/branches/current
    [HttpPut("branches/current")]
    public async Task<IActionResult> SwitchBranch([FromBody] SwitchBranchBody body, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        try
        {
            await _versioning.SwitchBranchAsync(series.RootPath, body.Name, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new ErrorDto(ex.Message));
        }
    }

    // GET /api/versions/scenes/{sceneId}/history
    [HttpGet("scenes/{sceneId:guid}/history")]
    public async Task<IActionResult> GetSceneHistory(Guid sceneId, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var all = await _versioning.GetHistoryAsync(series.RootPath, null, 200, ct);

        var results = new List<SnapshotSummaryDto>();
        foreach (var snap in all)
        {
            if (!snap.Scenes.TryGetValue(sceneId, out var hash))
                continue;

            // Include if it's the first snapshot or the hash changed from its parent
            if (snap.ParentId is null)
            {
                results.Add(ToSummary(snap));
                continue;
            }

            var parent = await _versioning.GetSnapshotAsync(series.RootPath, snap.ParentId.Value, ct);
            if (parent is null || !parent.Scenes.TryGetValue(sceneId, out var parentHash) || parentHash != hash)
                results.Add(ToSummary(snap));
        }

        return Ok(results);
    }

    // GET /api/versions/scenes/{sceneId}/at/{snapshotId}
    [HttpGet("scenes/{sceneId:guid}/at/{snapshotId:guid}")]
    public async Task<IActionResult> GetSceneAtSnapshot(Guid sceneId, Guid snapshotId, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var snapshot = await _versioning.GetSnapshotAsync(series.RootPath, snapshotId, ct);
        if (snapshot is null)
            return NotFound(new ErrorDto($"Snapshot {snapshotId} not found."));

        var content = await _versioning.GetSceneContentAtSnapshotAsync(series.RootPath, sceneId, snapshotId, ct);
        return Ok(new SceneAtSnapshotDto(sceneId, snapshotId, content));
    }

    // POST /api/versions/scenes/{sceneId}/restore/{snapshotId}
    [HttpPost("scenes/{sceneId:guid}/restore/{snapshotId:guid}")]
    public async Task<IActionResult> RestoreScene(Guid sceneId, Guid snapshotId, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var filePath = ResolveSceneFilePath(series, sceneId);
        if (filePath is null)
            return NotFound(new ErrorDto($"Scene {sceneId} not found in the open series."));

        try
        {
            await _versioning.RestoreSceneAsync(series.RootPath, sceneId, snapshotId, filePath, ct);
            return NoContent();
        }
        catch (SnapshotNotFoundException ex)
        {
            return NotFound(new ErrorDto(ex.Message));
        }
    }

    // POST /api/versions/restore/{snapshotId}
    [HttpPost("restore/{snapshotId:guid}")]
    public async Task<IActionResult> RestoreSnapshot(Guid snapshotId, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var snapshot = await _versioning.GetSnapshotAsync(series.RootPath, snapshotId, ct);
        if (snapshot is null)
            return NotFound(new ErrorDto($"Snapshot {snapshotId} not found."));

        var filePaths = BuildSceneFilePathMap(series);
        await _versioning.RestoreSnapshotAsync(series.RootPath, snapshotId, filePaths, ct);
        return NoContent();
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private async Task<Dictionary<Guid, string>> GatherSceneContentsAsync(
        Series series, CancellationToken ct)
    {
        var result = new Dictionary<Guid, string>();
        foreach (var book in series.Books)
        {
            foreach (var chapter in book.Chapters)
            {
                foreach (var scene in chapter.Scenes)
                {
                    try
                    {
                        var loaded = await _bookStorage.GetSceneAsync(book, scene.Id, ct);
                        if (loaded is not null)
                            result[scene.Id] = loaded.Content;
                    }
                    catch
                    {
                        // Skip scenes whose files are missing; don't abort the whole snapshot
                    }
                }
            }
        }
        return result;
    }

    private static Dictionary<Guid, string> BuildSceneTitleLookup(Series series)
    {
        var lookup = new Dictionary<Guid, string>();
        foreach (var book in series.Books)
            foreach (var chapter in book.Chapters)
                foreach (var scene in chapter.Scenes)
                    lookup[scene.Id] = scene.Title;
        return lookup;
    }

    private static Dictionary<Guid, string> BuildSceneFilePathMap(Series series)
    {
        var map = new Dictionary<Guid, string>();
        foreach (var book in series.Books)
            foreach (var chapter in book.Chapters)
                foreach (var scene in chapter.Scenes)
                    map[scene.Id] = Path.Combine(book.RootPath, scene.FilePath);
        return map;
    }

    private static string? ResolveSceneFilePath(Series series, Guid sceneId)
    {
        foreach (var book in series.Books)
            foreach (var chapter in book.Chapters)
                foreach (var scene in chapter.Scenes)
                    if (scene.Id == sceneId)
                        return Path.Combine(book.RootPath, scene.FilePath);
        return null;
    }

    private static List<SceneChangeDto> BuildChangeList(
        SnapshotDiff diff, Dictionary<Guid, string> titles)
    {
        var list = new List<SceneChangeDto>();
        foreach (var id in diff.Added)
            list.Add(new SceneChangeDto(id, titles.GetValueOrDefault(id, "(new scene)"), "added"));
        foreach (var id in diff.Modified)
            list.Add(new SceneChangeDto(id, titles.GetValueOrDefault(id, "(scene)"), "modified"));
        foreach (var id in diff.Removed)
            list.Add(new SceneChangeDto(id, titles.GetValueOrDefault(id, "(removed scene)"), "removed"));
        foreach (var id in diff.Unchanged)
            list.Add(new SceneChangeDto(id, titles.GetValueOrDefault(id, "(scene)"), "unchanged"));
        return list;
    }

    private static SnapshotSummaryDto ToSummary(Snapshot s) =>
        new(s.Id, s.Label, s.TimestampUtc, s.Branch, s.Scenes.Count);
}

public sealed record TakeSnapshotBody(string Label, string? Message);
public sealed record CreateBranchBody(string Name, Guid? FromSnapshotId);
public sealed record SwitchBranchBody(string Name);
