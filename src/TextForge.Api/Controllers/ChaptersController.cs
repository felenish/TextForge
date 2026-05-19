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
