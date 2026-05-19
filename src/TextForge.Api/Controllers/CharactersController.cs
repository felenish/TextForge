using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/characters")]
public sealed class CharactersController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;
    private readonly ICharacterStorageService _storage;

    public CharactersController(ISeriesWorkspaceService workspace, ICharacterStorageService storage)
    {
        _workspace = workspace;
        _storage = storage;
    }

    private string? CharactersPath()
    {
        var series = _workspace.GetCurrentSeries();
        return series is null ? null : Path.Combine(series.RootPath, "Characters");
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var path = CharactersPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var characters = await _storage.GetAllAsync(path, ct);
        return Ok(characters.Select(DtoMapper.ToCharacterDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOne(Guid id, CancellationToken ct)
    {
        var path = CharactersPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var character = await _storage.GetAsync(path, id, ct);
        if (character is null) return NotFound(new ErrorDto("Character not found."));
        return Ok(DtoMapper.ToCharacterDto(character));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCharacterBody request, CancellationToken ct)
    {
        var path = CharactersPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var character = await _storage.CreateAsync(path, request.Name, request.Role ?? string.Empty, ct);
        return Ok(DtoMapper.ToCharacterDto(character));
    }

    /// <summary>Partial update — only fields present and non-null are applied (sidebar rename etc).</summary>
    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Patch(Guid id, [FromBody] PatchCharacterBody request, CancellationToken ct)
    {
        var path = CharactersPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var character = await _storage.GetAsync(path, id, ct);
        if (character is null) return NotFound(new ErrorDto("Character not found."));

        if (request.Name is not null) character.Name = request.Name;
        if (request.Role is not null) character.Role = request.Role;

        await _storage.SaveAsync(path, character, ct);
        return Ok(DtoMapper.ToCharacterDto(character));
    }

    /// <summary>Full replace — overwrites all editable fields (character editor).</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Put(Guid id, [FromBody] PutCharacterBody request, CancellationToken ct)
    {
        var path = CharactersPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var character = await _storage.GetAsync(path, id, ct);
        if (character is null) return NotFound(new ErrorDto("Character not found."));

        character.Name = request.Name;
        character.Role = request.Role ?? string.Empty;
        character.Age = request.Age;
        character.Gender = string.IsNullOrEmpty(request.Gender) ? null : request.Gender;
        character.Personality = string.IsNullOrEmpty(request.Personality) ? null : request.Personality;
        character.Biography = string.IsNullOrEmpty(request.Biography) ? null : request.Biography;

        await _storage.SaveAsync(path, character, ct);
        return Ok(DtoMapper.ToCharacterDto(character));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var path = CharactersPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        await _storage.DeleteAsync(path, id, ct);
        return NoContent();
    }

    [HttpPut("{id:guid}/image")]
    public async Task<IActionResult> UploadImage(Guid id, IFormFile file, CancellationToken ct)
    {
        var path = CharactersPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var character = await _storage.GetAsync(path, id, ct);
        if (character is null) return NotFound(new ErrorDto("Character not found."));

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".gif" or ".webp"))
            ext = ".jpg";

        await using var stream = file.OpenReadStream();
        await _storage.SaveImageAsync(path, id, stream, ext, ct);

        character.ImageFileName = $"{id}{ext}";
        await _storage.SaveAsync(path, character, ct);
        return Ok(DtoMapper.ToCharacterDto(character));
    }

    [HttpGet("{id:guid}/image")]
    public async Task<IActionResult> GetImage(Guid id, CancellationToken ct)
    {
        var path = CharactersPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var result = await _storage.GetImageAsync(path, id, ct);
        if (result is null) return NotFound();
        return File(result.Value.Stream, result.Value.ContentType);
    }

    [HttpDelete("{id:guid}/image")]
    public async Task<IActionResult> DeleteImage(Guid id, CancellationToken ct)
    {
        var path = CharactersPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var character = await _storage.GetAsync(path, id, ct);
        if (character is null) return NotFound(new ErrorDto("Character not found."));

        _storage.DeleteImage(path, id);
        character.ImageFileName = null;
        await _storage.SaveAsync(path, character, ct);
        return NoContent();
    }
}

public sealed record CreateCharacterBody(string Name, string? Role);
public sealed record PatchCharacterBody(string? Name, string? Role);
public sealed record PutCharacterBody(
    string Name,
    string? Role,
    int? Age,
    string? Gender,
    string? Personality,
    string? Biography);
