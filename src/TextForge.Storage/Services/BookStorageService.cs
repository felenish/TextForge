using System.Text.Json;
using Microsoft.Extensions.Logging;
using TextForge.Core.Exceptions;
using TextForge.Core.Interfaces;
using TextForge.Core.Manifests;
using TextForge.Core.Models;
using TextForge.Core.Requests;
using TextForge.Core.Validation;
using TextForge.Storage.Utilities;

namespace TextForge.Storage.Services;

public sealed class BookStorageService : IBookStorageService
{
    private const string ManifestFileName = "book.tfbook";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    private readonly ILogger<BookStorageService> _logger;

    public BookStorageService(ILogger<BookStorageService> logger)
    {
        _logger = logger;
    }

    public async Task<BookProject> CreateBookAsync(CreateBookRequest request, CancellationToken ct = default)
    {
        TitleValidator.Validate(request.Title, nameof(request.Title));

        if (!Directory.Exists(request.ParentDirectory))
            throw new DirectoryNotFoundException(
                $"Parent directory does not exist: {request.ParentDirectory}");

        var rootPath = FolderPathBuilder.BuildBookFolder(request.ParentDirectory, request.Title);

        Directory.CreateDirectory(rootPath);
        Directory.CreateDirectory(Path.Combine(rootPath, "manuscript"));
        Directory.CreateDirectory(Path.Combine(rootPath, "assets"));
        Directory.CreateDirectory(Path.Combine(rootPath, ".textforge"));

        var now = DateTimeOffset.UtcNow;
        var manifest = new BookManifest
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            CreatedUtc = now,
            ModifiedUtc = now,
        };

        var manifestPath = Path.Combine(rootPath, ManifestFileName);
        await SafeFileWriter.WriteAsync(manifestPath, Serialize(manifest), ct);

        _logger.LogInformation("Created book '{Title}' at {RootPath}", request.Title, rootPath);

        return MapToProject(manifest, rootPath);
    }

    public async Task<BookProject> OpenBookAsync(string bookFilePath, CancellationToken ct = default)
    {
        if (!File.Exists(bookFilePath))
            throw new ManifestNotFoundException(
                $"Book manifest not found: {bookFilePath}");

        string json;
        try
        {
            json = await File.ReadAllTextAsync(bookFilePath, ct);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            throw new ManifestNotFoundException(
                $"Could not read book manifest: {bookFilePath}", ex);
        }

        BookManifest manifest;
        try
        {
            manifest = JsonSerializer.Deserialize<BookManifest>(json, JsonOptions)
                ?? throw new InvalidManifestException(
                    $"Manifest file deserialized to null: {bookFilePath}");
        }
        catch (JsonException ex)
        {
            throw new InvalidManifestException(
                $"Book manifest contains invalid JSON: {bookFilePath}", ex);
        }

        if (manifest.Version != BookManifest.CurrentVersion)
            _logger.LogWarning(
                "Manifest version {Version} differs from expected {Expected}. File: {Path}",
                manifest.Version, BookManifest.CurrentVersion, bookFilePath);

        var rootPath = Path.GetDirectoryName(bookFilePath)
            ?? throw new InvalidManifestException(
                $"Could not determine root path from manifest path: {bookFilePath}");

        _logger.LogInformation("Opened book '{Title}' from {Path}", manifest.Title, bookFilePath);

        return MapToProject(manifest, rootPath);
    }

    public async Task SaveBookAsync(BookProject book, CancellationToken ct = default)
    {
        book.ModifiedUtc = DateTimeOffset.UtcNow;

        var manifest = MapToManifest(book);
        var manifestPath = Path.Combine(book.RootPath, ManifestFileName);
        await SafeFileWriter.WriteAsync(manifestPath, Serialize(manifest), ct);
        _logger.LogDebug("Saved manifest for '{Title}' to {Path}", book.Title, manifestPath);

        foreach (var chapter in book.Chapters)
        {
            foreach (var scene in chapter.Scenes)
            {
                if (string.IsNullOrEmpty(scene.Content))
                    continue;

                var absPath = Path.Combine(book.RootPath, scene.FilePath);
                var dir = Path.GetDirectoryName(absPath);
                if (dir is not null && !Directory.Exists(dir))
                    Directory.CreateDirectory(dir);

                await SafeFileWriter.WriteAsync(absPath, scene.Content, ct);
                _logger.LogDebug("Saved scene '{Title}' to {Path}", scene.Title, absPath);
            }
        }

        _logger.LogInformation("Saved book '{Title}'", book.Title);
    }

    public Task<Scene?> GetSceneAsync(BookProject book, Guid sceneId, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task SaveSceneContentAsync(BookProject book, Guid sceneId, string content, CancellationToken ct = default)
        => throw new NotImplementedException();

    private static BookProject MapToProject(BookManifest manifest, string rootPath)
    {
        var project = new BookProject
        {
            Id = manifest.Id,
            Title = manifest.Title,
            RootPath = rootPath,
            CreatedUtc = manifest.CreatedUtc,
            ModifiedUtc = manifest.ModifiedUtc,
        };

        foreach (var cm in manifest.Chapters.OrderBy(c => c.SortOrder))
        {
            var chapter = new Chapter
            {
                Id = cm.Id,
                Title = cm.Title,
                FolderPath = cm.Folder,
                SortOrder = cm.SortOrder,
            };

            foreach (var sm in cm.Scenes.OrderBy(s => s.SortOrder))
            {
                chapter.Scenes.Add(new Scene
                {
                    Id = sm.Id,
                    Title = sm.Title,
                    FilePath = sm.File,
                    SortOrder = sm.SortOrder,
                });
            }

            project.Chapters.Add(chapter);
        }

        return project;
    }

    private static BookManifest MapToManifest(BookProject book)
    {
        return new BookManifest
        {
            Id = book.Id,
            Title = book.Title,
            CreatedUtc = book.CreatedUtc,
            ModifiedUtc = book.ModifiedUtc,
            Chapters = book.Chapters
                .OrderBy(c => c.SortOrder)
                .Select(c => new ChapterManifest
                {
                    Id = c.Id,
                    Title = c.Title,
                    Folder = c.FolderPath,
                    SortOrder = c.SortOrder,
                    Scenes = c.Scenes
                        .OrderBy(s => s.SortOrder)
                        .Select(s => new SceneManifest
                        {
                            Id = s.Id,
                            Title = s.Title,
                            File = s.FilePath,
                            SortOrder = s.SortOrder,
                        })
                        .ToList(),
                })
                .ToList(),
        };
    }

    private static string Serialize(BookManifest manifest) =>
        JsonSerializer.Serialize(manifest, JsonOptions);
}
