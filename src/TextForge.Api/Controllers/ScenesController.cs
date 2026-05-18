using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/scenes")]
public sealed class ScenesController : ControllerBase
{
    private readonly IBookWorkspaceService _workspace;
    private readonly IBookStorageService _storage;

    public ScenesController(IBookWorkspaceService workspace, IBookStorageService storage)
    {
        _workspace = workspace;
        _storage = storage;
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetScene(Guid id, CancellationToken ct)
    {
        var book = _workspace.GetCurrentBook();
        if (book is null)
            return NotFound(new ErrorDto("No book is open."));

        var scene = await _storage.GetSceneAsync(book, id, ct);
        if (scene is null)
            return NotFound(new ErrorDto("Scene not found."));

        return Ok(DtoMapper.ToSceneDto(scene));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> SaveScene(Guid id, [FromBody] SaveSceneBody request, CancellationToken ct)
    {
        var book = _workspace.GetCurrentBook();
        if (book is null)
            return NotFound(new ErrorDto("No book is open."));

        await _storage.SaveSceneContentAsync(book, id, request.Content, ct);
        _workspace.ClearDirtyScene(id);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteScene(Guid id, CancellationToken ct)
    {
        var book = _workspace.GetCurrentBook();
        if (book is null)
            return NotFound(new ErrorDto("No book is open."));

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
