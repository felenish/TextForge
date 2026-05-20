using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/scenes")]
public sealed class ScenesController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;
    private readonly IBookStorageService _storage;

    public ScenesController(ISeriesWorkspaceService workspace, IBookStorageService storage)
    {
        _workspace = workspace;
        _storage = storage;
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetScene(Guid id, CancellationToken ct)
    {
        var book = _workspace.FindBookByScene(id);
        if (book is null)
            return NotFound(new ErrorDto("Scene not found."));

        var scene = await _storage.GetSceneAsync(book, id, ct);
        if (scene is null)
            return NotFound(new ErrorDto("Scene not found."));

        return Ok(DtoMapper.ToSceneDto(scene));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> SaveScene(Guid id, [FromBody] SaveSceneBody request, CancellationToken ct)
    {
        var book = _workspace.FindBookByScene(id);
        if (book is null)
            return NotFound(new ErrorDto("Scene not found."));

        await _storage.SaveSceneContentAsync(book, id, request.Content, ct);
        _workspace.ClearDirtyScene(id);
        return NoContent();
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> PatchScene(Guid id, [FromBody] PatchSceneBody request, CancellationToken ct)
    {
        var book = _workspace.FindBookByScene(id);
        if (book is null)
            return NotFound(new ErrorDto("Scene not found."));

        var found = FindSceneWithChapter(book, id);
        if (found is null)
            return NotFound(new ErrorDto("Scene not found."));

        var scene = found.Value.scene;
        if (request.Title is not null) scene.Title = request.Title;
        if (request.Status is not null) scene.Status = request.Status;
        if (request.Pov is not null) scene.Pov = request.Pov.Length == 0 ? null : request.Pov;
        if (request.CharacterIds is not null)
            scene.CharacterIds = request.CharacterIds.Select(Guid.Parse).ToList();
        if (request.Notes is not null) scene.Notes = request.Notes.Length == 0 ? null : request.Notes;

        await _storage.SaveBookAsync(book, ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteScene(Guid id, CancellationToken ct)
    {
        var book = _workspace.FindBookByScene(id);
        if (book is null)
            return NotFound(new ErrorDto("Scene not found."));

        var found = FindSceneWithChapter(book, id);
        if (found is null)
            return NotFound(new ErrorDto("Scene not found."));

        var (chapter, scene) = found.Value;
        chapter.Scenes.Remove(scene);
        _workspace.ClearDirtyScene(id);

        var absPath = Path.Combine(book.RootPath, scene.FilePath);
        if (System.IO.File.Exists(absPath))
            System.IO.File.Delete(absPath);

        await _storage.SaveBookAsync(book, ct);
        return NoContent();
    }

    private static (Core.Models.Chapter chapter, Core.Models.Scene scene)? FindSceneWithChapter(
        Core.Models.BookProject book, Guid sceneId)
    {
        foreach (var chapter in book.Chapters)
        {
            var scene = chapter.Scenes.FirstOrDefault(s => s.Id == sceneId);
            if (scene is not null)
                return (chapter, scene);
        }
        return null;
    }
}

public sealed record SaveSceneBody(string Content);
public sealed record PatchSceneBody(
    string? Title,
    string? Status,
    string? Pov,
    IReadOnlyList<string>? CharacterIds,
    string? Notes);
