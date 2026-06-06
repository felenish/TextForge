using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/plotgrids")]
public sealed class PlotGridsController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;
    private readonly IPlotGridStorageService _storage;

    public PlotGridsController(ISeriesWorkspaceService workspace, IPlotGridStorageService storage)
    {
        _workspace = workspace;
        _storage = storage;
    }

    private string? PlotGridsPath()
    {
        var series = _workspace.GetCurrentSeries();
        return series is null ? null : Path.Combine(series.RootPath, "PlotGrids");
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var path = PlotGridsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var grids = await _storage.GetAllAsync(path, ct);
        return Ok(grids.Select(DtoMapper.ToPlotGridMeta));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOne(Guid id, CancellationToken ct)
    {
        var path = PlotGridsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var grid = await _storage.GetAsync(path, id, ct);
        if (grid is null) return NotFound(new ErrorDto("Plot grid not found."));
        return Ok(DtoMapper.ToPlotGridDto(grid));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePlotGridBody request, CancellationToken ct)
    {
        var path = PlotGridsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var grid = await _storage.CreateAsync(path, request.Name, ct);
        return Ok(DtoMapper.ToPlotGridDto(grid));
    }

    /// <summary>Rename only.</summary>
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] PatchPlotGridBody request, CancellationToken ct)
    {
        var path = PlotGridsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var grid = await _storage.GetAsync(path, id, ct);
        if (grid is null) return NotFound(new ErrorDto("Plot grid not found."));

        if (request.Name is not null) grid.Name = request.Name;

        await _storage.SaveAsync(path, grid, ct);
        return Ok(DtoMapper.ToPlotGridMeta(grid));
    }

    /// <summary>Full save — replaces all columns, rows, and cells.</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Put(Guid id, [FromBody] PutPlotGridBody request, CancellationToken ct)
    {
        var path = PlotGridsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var grid = await _storage.GetAsync(path, id, ct);
        if (grid is null) return NotFound(new ErrorDto("Plot grid not found."));

        grid.Name = request.Name;
        grid.Columns = request.Columns
            .Select(c => new PlotGridColumn { Id = c.Id, Label = c.Label })
            .ToList();
        grid.Rows = request.Rows
            .Select(r => new PlotGridRow { Id = r.Id, Label = r.Label })
            .ToList();
        grid.Cells = request.Cells
            .Where(c => !string.IsNullOrWhiteSpace(c.Content))
            .Select(c => new PlotGridCell { RowId = c.RowId, ColId = c.ColId, Content = c.Content })
            .ToList();

        await _storage.SaveAsync(path, grid, ct);
        return Ok(DtoMapper.ToPlotGridDto(grid));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var path = PlotGridsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        await _storage.DeleteAsync(path, id, ct);
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder([FromBody] ReorderWorldItemsBody request, CancellationToken ct)
    {
        var path = PlotGridsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var ids = request.Ids.Select(s => Guid.TryParse(s, out var g) ? g : (Guid?)null)
            .Where(g => g.HasValue).Select(g => g!.Value).ToList();
        await _storage.ReorderAsync(path, ids, ct);
        return NoContent();
    }
}

public sealed record CreatePlotGridBody(string Name);
public sealed record PatchPlotGridBody(string? Name);
public sealed record PutPlotGridBody(
    string Name,
    IReadOnlyList<PutPlotGridColumnBody> Columns,
    IReadOnlyList<PutPlotGridRowBody> Rows,
    IReadOnlyList<PutPlotGridCellBody> Cells);
public sealed record PutPlotGridColumnBody(string Id, string Label);
public sealed record PutPlotGridRowBody(string Id, string Label);
public sealed record PutPlotGridCellBody(string RowId, string ColId, string? Content);
