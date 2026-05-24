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

    [HttpPost("{id:guid}/assets")]
    public async Task<IActionResult> UploadAsset(Guid id, IFormFile file, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null || _workspace.FindBookByScene(id) is null)
            return NotFound(new ErrorDto("Scene not found."));

        string[] allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
        if (!allowed.Contains(file.ContentType?.ToLowerInvariant()))
            return BadRequest(new ErrorDto("Only image files are allowed."));

        var assetsDir = Path.Combine(series.RootPath, "assets");
        Directory.CreateDirectory(assetsDir);

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext)) ext = ".jpg";
        var filename = $"{Guid.NewGuid():N}{ext}";
        var absPath = Path.Combine(assetsDir, filename);

        await using var stream = new FileStream(absPath, FileMode.Create, FileAccess.Write);
        await file.CopyToAsync(stream, ct);

        return Ok(new { filename });
    }

    [HttpGet("{id:guid}/assets/{filename}")]
    public IActionResult GetAsset(Guid id, string filename)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null || _workspace.FindBookByScene(id) is null)
            return NotFound(new ErrorDto("Scene not found."));

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
