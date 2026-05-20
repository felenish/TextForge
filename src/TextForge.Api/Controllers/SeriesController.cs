using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/series")]
public sealed class SeriesController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;

    public SeriesController(ISeriesWorkspaceService workspace) => _workspace = workspace;

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
}

public sealed record CreateSeriesBody(string Title, string ParentDirectory);
public sealed record OpenSeriesBody(string Path);
public sealed record AddBookToSeriesBody(string Title);
public sealed record ReorderBooksBody(IReadOnlyList<string> Ids);
