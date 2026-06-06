using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/locations")]
public sealed class LocationsController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;
    private readonly ILocationStorageService _storage;

    public LocationsController(ISeriesWorkspaceService workspace, ILocationStorageService storage)
    {
        _workspace = workspace;
        _storage = storage;
    }

    private string? LocationsPath()
    {
        var series = _workspace.GetCurrentSeries();
        return series is null ? null : Path.Combine(series.RootPath, "Locations");
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var path = LocationsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var locations = await _storage.GetAllAsync(path, ct);
        return Ok(locations.Select(DtoMapper.ToLocationDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOne(Guid id, CancellationToken ct)
    {
        var path = LocationsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var location = await _storage.GetAsync(path, id, ct);
        if (location is null) return NotFound(new ErrorDto("Location not found."));
        return Ok(DtoMapper.ToLocationDto(location));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLocationBody request, CancellationToken ct)
    {
        var path = LocationsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var location = await _storage.CreateAsync(path, request.Name, ct);
        return Ok(DtoMapper.ToLocationDto(location));
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] PatchLocationBody request, CancellationToken ct)
    {
        var path = LocationsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var location = await _storage.GetAsync(path, id, ct);
        if (location is null) return NotFound(new ErrorDto("Location not found."));

        if (request.Name is not null) location.Name = request.Name;

        await _storage.SaveAsync(path, location, ct);
        return Ok(DtoMapper.ToLocationDto(location));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Put(Guid id, [FromBody] PutLocationBody request, CancellationToken ct)
    {
        var path = LocationsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var location = await _storage.GetAsync(path, id, ct);
        if (location is null) return NotFound(new ErrorDto("Location not found."));

        location.Name = request.Name;
        location.Description = string.IsNullOrEmpty(request.Description) ? null : request.Description;
        location.CustomSections = request.CustomSections
            .Select(s => new TextForge.Core.Models.LocationSection { Id = s.Id, Title = s.Title, Content = s.Content })
            .ToList();

        await _storage.SaveAsync(path, location, ct);
        return Ok(DtoMapper.ToLocationDto(location));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var path = LocationsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        await _storage.DeleteAsync(path, id, ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/image")]
    public async Task<IActionResult> UploadImage(Guid id, IFormFile file, CancellationToken ct)
    {
        var path = LocationsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var location = await _storage.GetAsync(path, id, ct);
        if (location is null) return NotFound(new ErrorDto("Location not found."));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".gif" or ".webp"))
            ext = ".jpg";

        await using var stream = file.OpenReadStream();
        await _storage.SaveImageAsync(path, id, stream, ext, ct);

        location.ImageFileName = $"{id}{ext}";
        await _storage.SaveAsync(path, location, ct);
        return Ok(DtoMapper.ToLocationDto(location));
    }

    [HttpGet("{id:guid}/image")]
    public async Task<IActionResult> GetImage(Guid id, CancellationToken ct)
    {
        var path = LocationsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var result = await _storage.GetImageAsync(path, id, ct);
        if (result is null) return NotFound();
        return File(result.Value.Stream, result.Value.ContentType);
    }

    [HttpDelete("{id:guid}/image")]
    public async Task<IActionResult> DeleteImage(Guid id, CancellationToken ct)
    {
        var path = LocationsPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var location = await _storage.GetAsync(path, id, ct);
        if (location is null) return NotFound(new ErrorDto("Location not found."));

        _storage.DeleteImage(path, id);
        location.ImageFileName = null;
        await _storage.SaveAsync(path, location, ct);
        return NoContent();
    }
}

public sealed record CreateLocationBody(string Name);
public sealed record PatchLocationBody(string? Name);
public sealed record PutLocationBody(string Name, string? Description, IReadOnlyList<PutLocationSectionBody> CustomSections);
public sealed record PutLocationSectionBody(Guid Id, string Title, string Content);
