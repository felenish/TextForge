using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/outlines")]
public sealed class OutlinesController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;
    private readonly IOutlineStorageService _storage;

    public OutlinesController(ISeriesWorkspaceService workspace, IOutlineStorageService storage)
    {
        _workspace = workspace;
        _storage = storage;
    }

    private string? OutlinesPath()
    {
        var series = _workspace.GetCurrentSeries();
        return series is null ? null : Path.Combine(series.RootPath, "Outlines");
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var path = OutlinesPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var outlines = await _storage.GetAllAsync(path, ct);
        return Ok(outlines.Select(DtoMapper.ToOutlineMeta));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOne(Guid id, CancellationToken ct)
    {
        var path = OutlinesPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var outline = await _storage.GetAsync(path, id, ct);
        if (outline is null) return NotFound(new ErrorDto("Outline not found."));
        return Ok(DtoMapper.ToOutlineDto(outline));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOutlineBody request, CancellationToken ct)
    {
        var path = OutlinesPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var outline = await _storage.CreateAsync(path, request.Name, ct);
        return Ok(DtoMapper.ToOutlineMeta(outline));
    }

    /// <summary>Rename — only updates the name field.</summary>
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] PatchOutlineBody request, CancellationToken ct)
    {
        var path = OutlinesPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var outline = await _storage.GetAsync(path, id, ct);
        if (outline is null) return NotFound(new ErrorDto("Outline not found."));

        if (request.Name is not null) outline.Name = request.Name;

        await _storage.SaveAsync(path, outline, ct);
        return Ok(DtoMapper.ToOutlineMeta(outline));
    }

    /// <summary>Full save — overwrites name and content (outline editor).</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Put(Guid id, [FromBody] PutOutlineBody request, CancellationToken ct)
    {
        var path = OutlinesPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var outline = await _storage.GetAsync(path, id, ct);
        if (outline is null) return NotFound(new ErrorDto("Outline not found."));

        outline.Name = request.Name;
        outline.Content = string.IsNullOrEmpty(request.Content) ? null : request.Content;

        await _storage.SaveAsync(path, outline, ct);
        return Ok(DtoMapper.ToOutlineDto(outline));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var path = OutlinesPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        await _storage.DeleteAsync(path, id, ct);
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder([FromBody] ReorderWorldItemsBody request, CancellationToken ct)
    {
        var path = OutlinesPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var ids = request.Ids.Select(s => Guid.TryParse(s, out var g) ? g : (Guid?)null)
            .Where(g => g.HasValue).Select(g => g!.Value).ToList();
        await _storage.ReorderAsync(path, ids, ct);
        return NoContent();
    }
}

public sealed record CreateOutlineBody(string Name);
public sealed record PatchOutlineBody(string? Name);
public sealed record PutOutlineBody(string Name, string? Content);
