using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using TextForge.Core.Exceptions;
using TextForge.Core.Manifests;
using TextForge.Core.Models;
using TextForge.Core.Requests;
using TextForge.Storage.Services;

namespace TextForge.Storage.Tests;

public sealed class BookStorageServiceTests : IDisposable
{
    private readonly string _tempDir;
    private readonly BookStorageService _sut;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    public BookStorageServiceTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"TextForgeTests_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        _sut = new BookStorageService(NullLogger<BookStorageService>.Instance);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    // ── CreateBookAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task CreateBookAsync_ProducesCorrectFolderStructure()
    {
        var book = await _sut.CreateBookAsync(new CreateBookRequest
        {
            Title = "My Novel",
            ParentDirectory = _tempDir,
        });

        Directory.Exists(Path.Combine(book.RootPath, "manuscript")).Should().BeTrue();
        Directory.Exists(Path.Combine(book.RootPath, "assets")).Should().BeTrue();
        Directory.Exists(Path.Combine(book.RootPath, ".textforge")).Should().BeTrue();
        File.Exists(Path.Combine(book.RootPath, "book.tfbook")).Should().BeTrue();
    }

    [Fact]
    public async Task CreateBookAsync_ManifestContainsCorrectMetadata()
    {
        var book = await _sut.CreateBookAsync(new CreateBookRequest
        {
            Title = "My Novel",
            ParentDirectory = _tempDir,
        });

        var json = await File.ReadAllTextAsync(Path.Combine(book.RootPath, "book.tfbook"));
        var manifest = JsonSerializer.Deserialize<BookManifest>(json, JsonOptions);

        manifest.Should().NotBeNull();
        manifest!.Version.Should().Be(BookManifest.CurrentVersion);
        manifest.Title.Should().Be("My Novel");
        manifest.Id.Should().Be(book.Id);
        manifest.CreatedUtc.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
    }

    // ── OpenBookAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task OpenBookAsync_ThrowsManifestNotFoundException_WhenFileDoesNotExist()
    {
        var act = () => _sut.OpenBookAsync(Path.Combine(_tempDir, "ghost", "book.tfbook"));
        await act.Should().ThrowAsync<ManifestNotFoundException>();
    }

    [Fact]
    public async Task OpenBookAsync_ThrowsInvalidManifestException_WhenJsonIsCorrupt()
    {
        var manifestPath = Path.Combine(_tempDir, "book.tfbook");
        await File.WriteAllTextAsync(manifestPath, "{ this is not valid json !!!");

        var act = () => _sut.OpenBookAsync(manifestPath);
        await act.Should().ThrowAsync<InvalidManifestException>();
    }

    [Fact]
    public async Task OpenBookAsync_RestoresChaptersAndScenesInSortOrder()
    {
        var manifest = new BookManifest
        {
            Id = Guid.NewGuid(),
            Title = "Sort Test",
            CreatedUtc = DateTimeOffset.UtcNow,
            ModifiedUtc = DateTimeOffset.UtcNow,
            Chapters =
            [
                new ChapterManifest
                {
                    Id = Guid.NewGuid(), Title = "Ch B", Folder = "manuscript/ch-002", SortOrder = 2,
                    Scenes =
                    [
                        new SceneManifest { Id = Guid.NewGuid(), Title = "Scene B2", File = "manuscript/ch-002/s-002.md", SortOrder = 2 },
                        new SceneManifest { Id = Guid.NewGuid(), Title = "Scene B1", File = "manuscript/ch-002/s-001.md", SortOrder = 1 },
                    ],
                },
                new ChapterManifest
                {
                    Id = Guid.NewGuid(), Title = "Ch A", Folder = "manuscript/ch-001", SortOrder = 1,
                    Scenes = [],
                },
            ],
        };

        var manifestPath = Path.Combine(_tempDir, "book.tfbook");
        await File.WriteAllTextAsync(manifestPath, JsonSerializer.Serialize(manifest, JsonOptions));

        var book = await _sut.OpenBookAsync(manifestPath);

        book.Chapters.Should().HaveCount(2);
        book.Chapters[0].Title.Should().Be("Ch A");
        book.Chapters[0].SortOrder.Should().Be(1);
        book.Chapters[1].Title.Should().Be("Ch B");
        book.Chapters[1].SortOrder.Should().Be(2);
        book.Chapters[1].Scenes[0].Title.Should().Be("Scene B1");
        book.Chapters[1].Scenes[1].Title.Should().Be("Scene B2");
    }

    // ── SaveBookAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task SaveBookAsync_RoundTrips_AllChaptersAndScenes()
    {
        var book = await _sut.CreateBookAsync(new CreateBookRequest { Title = "Round Trip", ParentDirectory = _tempDir });
        AddChapterWithScene(book, "Chapter One", "Opening Scene", "Hello, world.");

        await _sut.SaveBookAsync(book);
        var reopened = await _sut.OpenBookAsync(Path.Combine(book.RootPath, "book.tfbook"));

        reopened.Title.Should().Be("Round Trip");
        reopened.Chapters.Should().HaveCount(1);
        reopened.Chapters[0].Title.Should().Be("Chapter One");
        reopened.Chapters[0].Scenes.Should().HaveCount(1);
        reopened.Chapters[0].Scenes[0].Title.Should().Be("Opening Scene");
    }

    [Fact]
    public async Task SaveBookAsync_PreservesGuidIdentities()
    {
        var book = await _sut.CreateBookAsync(new CreateBookRequest { Title = "GUIDs", ParentDirectory = _tempDir });
        var chapterId = Guid.NewGuid();
        var sceneId = Guid.NewGuid();
        AddChapterWithScene(book, "Ch", "Sc", "Content", chapterId, sceneId);

        await _sut.SaveBookAsync(book);
        var reopened = await _sut.OpenBookAsync(Path.Combine(book.RootPath, "book.tfbook"));

        reopened.Id.Should().Be(book.Id);
        reopened.Chapters[0].Id.Should().Be(chapterId);
        reopened.Chapters[0].Scenes[0].Id.Should().Be(sceneId);
    }

    [Fact]
    public async Task SaveBookAsync_UpdatesModifiedUtc()
    {
        var book = await _sut.CreateBookAsync(new CreateBookRequest { Title = "Timestamps", ParentDirectory = _tempDir });
        var originalModified = book.ModifiedUtc;

        await Task.Delay(20);
        await _sut.SaveBookAsync(book);

        book.ModifiedUtc.Should().BeAfter(originalModified);
    }

    [Fact]
    public async Task SaveBookAsync_SafeWrite_LeavesOriginalIntactWhenStaleTemporaryFileExists()
    {
        var book = await _sut.CreateBookAsync(new CreateBookRequest { Title = "Safe Write", ParentDirectory = _tempDir });
        var manifestPath = Path.Combine(book.RootPath, "book.tfbook");

        // Simulate a .tmp left behind by a prior crashed write
        await File.WriteAllTextAsync(manifestPath + ".tmp", "{ corrupt garbage }");

        await _sut.SaveBookAsync(book);
        var reopened = await _sut.OpenBookAsync(manifestPath);

        reopened.Title.Should().Be("Safe Write");
    }

    // ── GetSceneAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetSceneAsync_ThrowsSceneFileNotFoundException_WhenSceneFileMissing()
    {
        var book = await _sut.CreateBookAsync(new CreateBookRequest { Title = "Missing Scene", ParentDirectory = _tempDir });
        var sceneId = Guid.NewGuid();
        // Add scene to in-memory model but never write the file to disk
        AddChapterWithScene(book, "Ch", "Sc", content: null, sceneId: sceneId);

        var act = () => _sut.GetSceneAsync(book, sceneId);
        await act.Should().ThrowAsync<SceneFileNotFoundException>();
    }

    [Fact]
    public async Task GetSceneAsync_ReturnsCorrectContent()
    {
        var book = await _sut.CreateBookAsync(new CreateBookRequest { Title = "Get Scene", ParentDirectory = _tempDir });
        var sceneId = Guid.NewGuid();
        AddChapterWithScene(book, "Ch", "Sc", "The quick brown fox.", sceneId: sceneId);
        await _sut.SaveBookAsync(book);

        // Clear in-memory content to force a disk read
        book.Chapters[0].Scenes[0].Content = string.Empty;

        var scene = await _sut.GetSceneAsync(book, sceneId);

        scene.Should().NotBeNull();
        scene!.Content.Should().Be("The quick brown fox.");
    }

    // ── SaveSceneContentAsync ────────────────────────────────────────────────

    [Fact]
    public async Task SaveSceneContentAsync_PersistsContentToDisk()
    {
        var book = await _sut.CreateBookAsync(new CreateBookRequest { Title = "Save Scene", ParentDirectory = _tempDir });
        var sceneId = Guid.NewGuid();
        AddChapterWithScene(book, "Ch", "Sc", "Initial content.", sceneId: sceneId);
        await _sut.SaveBookAsync(book);

        await _sut.SaveSceneContentAsync(book, sceneId, "Updated content.");

        var absPath = Path.Combine(book.RootPath, book.Chapters[0].Scenes[0].FilePath);
        var onDisk = await File.ReadAllTextAsync(absPath);
        onDisk.Should().Be("Updated content.");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static void AddChapterWithScene(
        BookProject book,
        string chapterTitle,
        string sceneTitle,
        string? content = null,
        Guid? chapterId = null,
        Guid? sceneId = null)
    {
        var idx = book.Chapters.Count + 1;
        var chapterSlug = chapterTitle.ToLowerInvariant().Replace(' ', '-');
        var folderPath = $"manuscript/chapter-{idx:D3}-{chapterSlug}";

        var sceneSlug = sceneTitle.ToLowerInvariant().Replace(' ', '-');
        var filePath = $"{folderPath}/scene-001-{sceneSlug}.md";

        var chapter = new Chapter
        {
            Id = chapterId ?? Guid.NewGuid(),
            Title = chapterTitle,
            FolderPath = folderPath,
            SortOrder = idx,
        };

        chapter.Scenes.Add(new Scene
        {
            Id = sceneId ?? Guid.NewGuid(),
            Title = sceneTitle,
            FilePath = filePath,
            SortOrder = 1,
            Content = content ?? string.Empty,
        });

        book.Chapters.Add(chapter);
    }
}
