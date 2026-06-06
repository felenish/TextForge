using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;
using TextForge.Storage.Utilities;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/books/{bookId:guid}/chapters")]
public sealed class ChaptersController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;
    private readonly IBookStorageService _storage;

    public ChaptersController(ISeriesWorkspaceService workspace, IBookStorageService storage)
    {
        _workspace = workspace;
        _storage = storage;
    }

    [HttpPost]
    public async Task<IActionResult> AddChapter(Guid bookId, [FromBody] AddChapterBody request, CancellationToken ct)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null)
            return NotFound(new ErrorDto("Book not found."));

        var idx = book.Chapters.Count + 1;
        var absFolder = FolderPathBuilder.BuildChapterFolder(
            Path.Combine(book.RootPath, "manuscript"), idx, request.Title);
        var relFolder = Path.GetRelativePath(book.RootPath, absFolder);

        var chapter = new Chapter
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            FolderPath = relFolder,
            SortOrder = idx,
        };
        book.Chapters.Add(chapter);
        Directory.CreateDirectory(absFolder);
        await _storage.SaveBookAsync(book, ct);

        return Ok(DtoMapper.ToChapterDto(chapter));
    }

    [HttpPut("{chapterId:guid}")]
    public async Task<IActionResult> UpdateChapter(
        Guid bookId, Guid chapterId, [FromBody] UpdateChapterBody request, CancellationToken ct)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null)
            return NotFound(new ErrorDto("Book not found."));

        var chapter = book.Chapters.FirstOrDefault(c => c.Id == chapterId);
        if (chapter is null)
            return NotFound(new ErrorDto("Chapter not found."));

        if (request.Title is not null)
            chapter.Title = request.Title;
        if (request.SortOrder is not null)
            chapter.SortOrder = request.SortOrder.Value;

        await _storage.SaveBookAsync(book, ct);
        return Ok(DtoMapper.ToChapterDto(chapter));
    }

    [HttpDelete("{chapterId:guid}")]
    public async Task<IActionResult> DeleteChapter(Guid bookId, Guid chapterId, CancellationToken ct)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null)
            return NotFound(new ErrorDto("Book not found."));

        var chapter = book.Chapters.FirstOrDefault(c => c.Id == chapterId);
        if (chapter is null)
            return NotFound(new ErrorDto("Chapter not found."));

        foreach (var scene in chapter.Scenes)
            _workspace.ClearDirtyScene(scene.Id);

        book.Chapters.Remove(chapter);

        var absFolder = Path.Combine(book.RootPath, chapter.FolderPath);
        if (Directory.Exists(absFolder))
            Directory.Delete(absFolder, recursive: true);

        await _storage.SaveBookAsync(book, ct);
        return NoContent();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderChapters(Guid bookId, [FromBody] ReorderBody request, CancellationToken ct)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null)
            return NotFound(new ErrorDto("Book not found."));

        var ordered = request.Ids
            .Select(id => Guid.TryParse(id, out var g) ? book.Chapters.FirstOrDefault(c => c.Id == g) : null)
            .Where(c => c is not null)
            .Select(c => c!)
            .ToList();

        for (var i = 0; i < ordered.Count; i++)
            ordered[i].SortOrder = i + 1;

        book.Chapters.Clear();
        book.Chapters.AddRange(ordered);
        await _storage.SaveBookAsync(book, ct);
        return NoContent();
    }

    [HttpPost("{chapterId:guid}/scenes/reorder")]
    public async Task<IActionResult> ReorderScenes(
        Guid bookId, Guid chapterId, [FromBody] ReorderBody request, CancellationToken ct)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null)
            return NotFound(new ErrorDto("Book not found."));

        var chapter = book.Chapters.FirstOrDefault(c => c.Id == chapterId);
        if (chapter is null)
            return NotFound(new ErrorDto("Chapter not found."));

        var requestedIds = request.Ids
            .Select(id => Guid.TryParse(id, out var g) ? (Guid?)g : null)
            .Where(g => g.HasValue)
            .Select(g => g!.Value)
            .ToHashSet();

        // Scenes mentioned in the request get explicit sort positions;
        // any scenes NOT in the request are appended after, preserving them.
        var ordered = requestedIds
            .Select(id => chapter.Scenes.FirstOrDefault(s => s.Id == id))
            .Where(s => s is not null)
            .Select(s => s!)
            .ToList();

        var remainder = chapter.Scenes.Where(s => !requestedIds.Contains(s.Id)).ToList();
        ordered.AddRange(remainder);

        for (var i = 0; i < ordered.Count; i++)
            ordered[i].SortOrder = i + 1;

        chapter.Scenes.Clear();
        chapter.Scenes.AddRange(ordered);
        await _storage.SaveBookAsync(book, ct);
        return NoContent();
    }

    [HttpPost("/api/books/{bookId:guid}/scenes/move")]
    public async Task<IActionResult> MoveScene(Guid bookId, [FromBody] MoveSceneBody request, CancellationToken ct)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null)
            return NotFound(new ErrorDto("Book not found."));

        Chapter? sourceChapter = null;
        Scene? scene = null;
        foreach (var ch in book.Chapters)
        {
            var s = ch.Scenes.FirstOrDefault(s => s.Id == request.SceneId);
            if (s is not null) { sourceChapter = ch; scene = s; break; }
        }
        if (sourceChapter is null || scene is null)
            return NotFound(new ErrorDto("Scene not found."));

        var targetChapter = book.Chapters.FirstOrDefault(c => c.Id == request.TargetChapterId);
        if (targetChapter is null)
            return NotFound(new ErrorDto("Target chapter not found."));

        if (sourceChapter.Id != targetChapter.Id)
        {
            var oldAbsPath = Path.Combine(book.RootPath, scene.FilePath);
            var fileName = Path.GetFileName(scene.FilePath);
            var newAbsPath = Path.Combine(book.RootPath, targetChapter.FolderPath, fileName);

            if (System.IO.File.Exists(newAbsPath) && !string.Equals(oldAbsPath, newAbsPath, StringComparison.OrdinalIgnoreCase))
            {
                var stem = Path.GetFileNameWithoutExtension(fileName);
                var ext = Path.GetExtension(fileName);
                for (var i = 2; i <= 999; i++)
                {
                    newAbsPath = Path.Combine(book.RootPath, targetChapter.FolderPath, $"{stem}-{i}{ext}");
                    if (!System.IO.File.Exists(newAbsPath)) break;
                }
                fileName = Path.GetFileName(newAbsPath);
            }

            if (System.IO.File.Exists(oldAbsPath))
                System.IO.File.Move(oldAbsPath, newAbsPath);

            scene.FilePath = Path.Combine(targetChapter.FolderPath, fileName).Replace('\\', '/');
            sourceChapter.Scenes.Remove(scene);
            var insertAt = Math.Clamp(request.TargetIndex, 0, targetChapter.Scenes.Count);
            targetChapter.Scenes.Insert(insertAt, scene);
        }
        else
        {
            sourceChapter.Scenes.Remove(scene);
            var insertAt = Math.Clamp(request.TargetIndex, 0, sourceChapter.Scenes.Count);
            sourceChapter.Scenes.Insert(insertAt, scene);
        }

        for (var i = 0; i < sourceChapter.Scenes.Count; i++) sourceChapter.Scenes[i].SortOrder = i + 1;
        if (targetChapter.Id != sourceChapter.Id)
            for (var i = 0; i < targetChapter.Scenes.Count; i++) targetChapter.Scenes[i].SortOrder = i + 1;

        await _storage.SaveBookAsync(book, ct);
        return NoContent();
    }

    [HttpPost("{chapterId:guid}/scenes")]
    public async Task<IActionResult> AddScene(
        Guid bookId, Guid chapterId, [FromBody] AddSceneBody request, CancellationToken ct)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null)
            return NotFound(new ErrorDto("Book not found."));

        var chapter = book.Chapters.FirstOrDefault(c => c.Id == chapterId);
        if (chapter is null)
            return NotFound(new ErrorDto("Chapter not found."));

        var idx = chapter.Scenes.Count + 1;
        var fileName = FolderPathBuilder.BuildSceneFileName(idx, request.Title);
        var relFilePath = Path.Combine(chapter.FolderPath, fileName).Replace('\\', '/');

        var scene = new Scene
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            FilePath = relFilePath,
            SortOrder = idx,
            Content = string.Empty,
        };
        chapter.Scenes.Add(scene);
        await _storage.SaveSceneContentAsync(book, scene.Id, string.Empty, ct);

        return Ok(DtoMapper.ToSceneDto(scene));
    }
}

public sealed record AddChapterBody(string Title);
public sealed record UpdateChapterBody(string? Title, int? SortOrder);
public sealed record AddSceneBody(string Title);
public sealed record ReorderBody(IReadOnlyList<string> Ids);
public sealed record MoveSceneBody(Guid SceneId, Guid TargetChapterId, int TargetIndex);
