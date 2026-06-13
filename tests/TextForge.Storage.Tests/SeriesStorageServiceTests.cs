using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using TextForge.Core.Exceptions;
using TextForge.Core.Manifests;
using TextForge.Core.Manifests.Migrations;
using TextForge.Core.Requests;
using TextForge.Storage.Services;

namespace TextForge.Storage.Tests;

public sealed class SeriesStorageServiceTests : IDisposable
{
    private readonly string _tempDir;
    private readonly BookStorageService _bookStorage;
    private readonly SeriesStorageService _sut;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    public SeriesStorageServiceTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"TextForgeSeriesTests_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
        var migrator = new BookManifestMigrator(
            [new AddModulesKeyMigration()],
            NullLogger<BookManifestMigrator>.Instance);
        _bookStorage = new BookStorageService(NullLogger<BookStorageService>.Instance, migrator);
        _sut = new SeriesStorageService(_bookStorage, NullLogger<SeriesStorageService>.Instance);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    // ── CreateSeriesAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task CreateSeriesAsync_ProducesSeriesFolderAndManifest()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "The Chronicles",
            ParentDirectory = _tempDir,
        });

        Directory.Exists(series.RootPath).Should().BeTrue();
        File.Exists(Path.Combine(series.RootPath, "series.tfseries")).Should().BeTrue();
    }

    [Fact]
    public async Task CreateSeriesAsync_ManifestContainsCorrectMetadata()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "The Chronicles",
            ParentDirectory = _tempDir,
        });

        var json = await File.ReadAllTextAsync(Path.Combine(series.RootPath, "series.tfseries"));
        var manifest = JsonSerializer.Deserialize<SeriesManifest>(json, JsonOptions);

        manifest.Should().NotBeNull();
        manifest!.Version.Should().Be(SeriesManifest.CurrentVersion);
        manifest.Title.Should().Be("The Chronicles");
        manifest.Id.Should().Be(series.Id);
        manifest.Books.Should().BeEmpty();
        manifest.CreatedUtc.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task CreateSeriesAsync_StartsWithNoBooks()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "Empty Series",
            ParentDirectory = _tempDir,
        });

        series.Books.Should().BeEmpty();
    }

    // ── OpenSeriesAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task OpenSeriesAsync_ThrowsManifestNotFoundException_WhenFileDoesNotExist()
    {
        var act = () => _sut.OpenSeriesAsync(Path.Combine(_tempDir, "ghost", "series.tfseries"));
        await act.Should().ThrowAsync<ManifestNotFoundException>();
    }

    [Fact]
    public async Task OpenSeriesAsync_ThrowsInvalidManifestException_WhenJsonIsCorrupt()
    {
        var path = Path.Combine(_tempDir, "series.tfseries");
        await File.WriteAllTextAsync(path, "{ not valid json !!!");

        var act = () => _sut.OpenSeriesAsync(path);
        await act.Should().ThrowAsync<InvalidManifestException>();
    }

    // ── AddBookAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task AddBookAsync_CreatesBookSubfolderInsideSeries()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "My Series",
            ParentDirectory = _tempDir,
        });

        var book = await _sut.AddBookAsync(series, "Book One");

        book.RootPath.Should().StartWith(series.RootPath);
        Directory.Exists(book.RootPath).Should().BeTrue();
        File.Exists(Path.Combine(book.RootPath, "book.tfbook")).Should().BeTrue();
    }

    [Fact]
    public async Task AddBookAsync_AppendsBookToSeriesInMemory()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "My Series",
            ParentDirectory = _tempDir,
        });

        await _sut.AddBookAsync(series, "Book One");
        await _sut.AddBookAsync(series, "Book Two");

        series.Books.Should().HaveCount(2);
        series.Books[0].Title.Should().Be("Book One");
        series.Books[1].Title.Should().Be("Book Two");
    }

    [Fact]
    public async Task AddBookAsync_PersistsBookEntryToSeriesManifest()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "My Series",
            ParentDirectory = _tempDir,
        });

        var book = await _sut.AddBookAsync(series, "Book One");

        var json = await File.ReadAllTextAsync(Path.Combine(series.RootPath, "series.tfseries"));
        var manifest = JsonSerializer.Deserialize<SeriesManifest>(json, JsonOptions);

        manifest!.Books.Should().HaveCount(1);
        manifest.Books[0].Id.Should().Be(book.Id);
        manifest.Books[0].Folder.Should().NotBeNullOrWhiteSpace();
    }

    // ── Round-trip ───────────────────────────────────────────────────────────

    [Fact]
    public async Task OpenSeriesAsync_RoundTrips_AllBooks()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "Round Trip",
            ParentDirectory = _tempDir,
        });
        await _sut.AddBookAsync(series, "Book One");
        await _sut.AddBookAsync(series, "Book Two");

        var reopened = await _sut.OpenSeriesAsync(
            Path.Combine(series.RootPath, "series.tfseries"));

        reopened.Title.Should().Be("Round Trip");
        reopened.Id.Should().Be(series.Id);
        reopened.Books.Should().HaveCount(2);
        reopened.Books[0].Title.Should().Be("Book One");
        reopened.Books[1].Title.Should().Be("Book Two");
    }

    [Fact]
    public async Task OpenSeriesAsync_PreservesBookSortOrder()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "Ordered Series",
            ParentDirectory = _tempDir,
        });
        await _sut.AddBookAsync(series, "Alpha");
        await _sut.AddBookAsync(series, "Beta");
        await _sut.AddBookAsync(series, "Gamma");

        var reopened = await _sut.OpenSeriesAsync(
            Path.Combine(series.RootPath, "series.tfseries"));

        reopened.Books.Select(b => b.Title)
            .Should().ContainInOrder("Alpha", "Beta", "Gamma");
    }

    [Fact]
    public async Task OpenSeriesAsync_PreservesBookGuids()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "GUID Check",
            ParentDirectory = _tempDir,
        });
        var book = await _sut.AddBookAsync(series, "Book One");

        var reopened = await _sut.OpenSeriesAsync(
            Path.Combine(series.RootPath, "series.tfseries"));

        reopened.Books[0].Id.Should().Be(book.Id);
    }

    // ── SaveSeriesAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task SaveSeriesAsync_SafeWrite_LeavesOriginalIntactWhenStaleTemporaryFileExists()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "Safe Write",
            ParentDirectory = _tempDir,
        });
        var manifestPath = Path.Combine(series.RootPath, "series.tfseries");

        await File.WriteAllTextAsync(manifestPath + ".tmp", "{ corrupt garbage }");

        await _sut.SaveSeriesAsync(series);
        var reopened = await _sut.OpenSeriesAsync(manifestPath);

        reopened.Title.Should().Be("Safe Write");
    }

    [Fact]
    public async Task SaveSeriesAsync_UpdatesModifiedUtc()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "Timestamps",
            ParentDirectory = _tempDir,
        });
        var originalModified = series.ModifiedUtc;

        await Task.Delay(20);
        await _sut.SaveSeriesAsync(series);

        series.ModifiedUtc.Should().BeAfter(originalModified);
    }

    // ── RemoveBookAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task RemoveBookAsync_DeletesBookFolderFromDisk()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "Remove Test",
            ParentDirectory = _tempDir,
        });
        var book = await _sut.AddBookAsync(series, "Doomed Book");
        var bookPath = book.RootPath;

        await _sut.RemoveBookAsync(series, book.Id);

        Directory.Exists(bookPath).Should().BeFalse();
    }

    [Fact]
    public async Task RemoveBookAsync_RemovesBookFromSeriesInMemory()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "Remove Test",
            ParentDirectory = _tempDir,
        });
        await _sut.AddBookAsync(series, "Keep");
        var doomed = await _sut.AddBookAsync(series, "Doomed");

        await _sut.RemoveBookAsync(series, doomed.Id);

        series.Books.Should().HaveCount(1);
        series.Books[0].Title.Should().Be("Keep");
    }

    [Fact]
    public async Task RemoveBookAsync_PersistsDeletionToSeriesManifest()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "Remove Test",
            ParentDirectory = _tempDir,
        });
        await _sut.AddBookAsync(series, "Keep");
        var doomed = await _sut.AddBookAsync(series, "Doomed");

        await _sut.RemoveBookAsync(series, doomed.Id);

        var reopened = await _sut.OpenSeriesAsync(Path.Combine(series.RootPath, "series.tfseries"));
        reopened.Books.Should().HaveCount(1);
        reopened.Books[0].Title.Should().Be("Keep");
    }

    [Fact]
    public async Task RemoveBookAsync_ThrowsWhenBookNotFound()
    {
        var series = await _sut.CreateSeriesAsync(new CreateSeriesRequest
        {
            Title = "Remove Test",
            ParentDirectory = _tempDir,
        });

        var act = () => _sut.RemoveBookAsync(series, Guid.NewGuid());
        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
