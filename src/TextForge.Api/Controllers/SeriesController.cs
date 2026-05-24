using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/series")]
public sealed class SeriesController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;
    private readonly IBookStorageService _storage;

    public SeriesController(ISeriesWorkspaceService workspace, IBookStorageService storage)
    {
        _workspace = workspace;
        _storage = storage;
    }

    [HttpPost]
    public async Task<IActionResult> CreateSeries([FromBody] CreateSeriesBody request, CancellationToken ct)
    {
        var series = await _workspace.CreateSeriesAsync(request.Title, request.ParentDirectory, ct);
        return Ok(DtoMapper.ToSeriesDto(series));
    }

    [HttpPost("open")]
    public async Task<IActionResult> OpenSeries([FromBody] OpenSeriesBody request, CancellationToken ct)
    {
        var series = await _workspace.OpenSeriesAsync(request.Path, ct);
        return Ok(DtoMapper.ToSeriesDto(series));
    }

    [HttpGet("current")]
    public IActionResult GetCurrentSeries()
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return NoContent();
        return Ok(DtoMapper.ToSeriesDto(series));
    }

    [HttpPost("current/books")]
    public async Task<IActionResult> AddBook([FromBody] AddBookToSeriesBody request, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var book = await _workspace.AddBookAsync(request.Title, ct);
        return Ok(DtoMapper.ToBookDto(book));
    }

    [HttpPost("current/books/reorder")]
    public async Task<IActionResult> ReorderBooks([FromBody] ReorderBooksBody request, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var ordered = request.Ids
            .Select(id => Guid.TryParse(id, out var g) ? series.Books.FirstOrDefault(b => b.Id == g) : null)
            .Where(b => b is not null)
            .Select(b => b!)
            .ToList();

        series.Books.Clear();
        series.Books.AddRange(ordered);
        await _workspace.SaveSeriesAsync(ct);
        return NoContent();
    }

    [HttpDelete("current")]
    public IActionResult CloseSeries()
    {
        _workspace.CloseSeries();
        return NoContent();
    }

    [HttpDelete("current/books/{bookId:guid}")]
    public async Task<IActionResult> RemoveBook(Guid bookId, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        await _workspace.RemoveBookAsync(bookId, ct);
        return NoContent();
    }

    [HttpGet("current/search")]
    public async Task<IActionResult> SearchSeries([FromQuery] string? q, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(Array.Empty<SceneSearchResultDto>());

        var results = new List<SceneSearchResultDto>();

        foreach (var book in series.Books)
        {
            foreach (var chapter in book.Chapters)
            {
                foreach (var scene in chapter.Scenes)
                {
                    if (scene.Title.Contains(q, StringComparison.OrdinalIgnoreCase))
                    {
                        results.Add(new SceneSearchResultDto(scene.Id.ToString(), scene.Title, chapter.Title, book.Title, null));
                        continue;
                    }

                    Core.Models.Scene? loaded = null;
                    try { loaded = await _storage.GetSceneAsync(book, scene.Id, ct); }
                    catch { /* skip unreadable scenes */ }

                    if (loaded is null) continue;

                    var idx = loaded.Content.IndexOf(q, StringComparison.OrdinalIgnoreCase);
                    if (idx >= 0)
                        results.Add(new SceneSearchResultDto(scene.Id.ToString(), scene.Title, chapter.Title, book.Title, ExtractSnippet(loaded.Content, idx, q.Length)));
                }
            }
        }

        return Ok(results.Take(50));
    }

    [HttpGet("current/assets")]
    public IActionResult ListAssets()
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var assetsDir = Path.Combine(series.RootPath, "assets");
        if (!Directory.Exists(assetsDir))
            return Ok(Array.Empty<object>());

        string[] imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
        var files = Directory.GetFiles(assetsDir)
            .Where(f => imageExts.Contains(Path.GetExtension(f).ToLowerInvariant()))
            .Select(f => new { filename = Path.GetFileName(f) })
            .ToList();

        return Ok(files);
    }

    [HttpGet("current/assets/{filename}")]
    public IActionResult GetAsset(string filename)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var safeName = Path.GetFileName(filename);
        var absPath = Path.Combine(series.RootPath, "assets", safeName);

        if (!System.IO.File.Exists(absPath))
            return NotFound(new ErrorDto("Asset not found."));

        var mime = Path.GetExtension(safeName).ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png"            => "image/png",
            ".gif"            => "image/gif",
            ".webp"           => "image/webp",
            ".svg"            => "image/svg+xml",
            _                 => "application/octet-stream",
        };

        return PhysicalFile(absPath, mime);
    }

    private static string ExtractSnippet(string text, int matchIdx, int matchLen, int window = 60)
    {
        var start = Math.Max(0, matchIdx - window);
        var end = Math.Min(text.Length, matchIdx + matchLen + window);
        var prefix = start > 0 ? "…" : "";
        var suffix = end < text.Length ? "…" : "";
        return prefix + text[start..end].Trim() + suffix;
    }
}

public sealed record CreateSeriesBody(string Title, string ParentDirectory);
public sealed record OpenSeriesBody(string Path);
public sealed record AddBookToSeriesBody(string Title);
public sealed record ReorderBooksBody(IReadOnlyList<string> Ids);
public sealed record SceneSearchResultDto(string SceneId, string SceneTitle, string ChapterTitle, string BookTitle, string? Snippet);
