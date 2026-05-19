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

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCharacterBody request, CancellationToken ct)
    {
        var path = CharactersPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var character = await _storage.CreateAsync(path, request.Name, request.Role ?? string.Empty, ct);
        return Ok(DtoMapper.ToCharacterDto(character));
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] PatchCharacterBody request, CancellationToken ct)
    {
        var path = CharactersPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        var character = await _storage.GetAsync(path, id, ct);
        if (character is null) return NotFound(new ErrorDto("Character not found."));

        if (request.Name is not null) character.Name = request.Name;
        if (request.Role is not null) character.Role = request.Role;
        if (request.Notes is not null) character.Notes = request.Notes;

        await _storage.SaveAsync(path, character, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var path = CharactersPath();
        if (path is null) return BadRequest(new ErrorDto("No series is open."));

        await _storage.DeleteAsync(path, id, ct);
        return NoContent();
    }
}

public sealed record CreateCharacterBody(string Name, string? Role);
public sealed record PatchCharacterBody(string? Name, string? Role, string? Notes);
