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

public sealed class SeriesStorageService : ISeriesStorageService
{
    private const string ManifestFileName = "series.tfseries";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    private readonly IBookStorageService _bookStorage;
    private readonly ILogger<SeriesStorageService> _logger;

    public SeriesStorageService(IBookStorageService bookStorage, ILogger<SeriesStorageService> logger)
    {
        _bookStorage = bookStorage;
        _logger = logger;
    }

    public async Task<Series> CreateSeriesAsync(CreateSeriesRequest request, CancellationToken ct = default)
    {
        TitleValidator.Validate(request.Title, nameof(request.Title));

        if (!Directory.Exists(request.ParentDirectory))
            throw new DirectoryNotFoundException(
                $"Parent directory does not exist: {request.ParentDirectory}");

        var rootPath = FolderPathBuilder.BuildSeriesFolder(request.ParentDirectory, request.Title);
        Directory.CreateDirectory(rootPath);

        var now = DateTimeOffset.UtcNow;
        var manifest = new SeriesManifest
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            CreatedUtc = now,
            ModifiedUtc = now,
        };

        var manifestPath = Path.Combine(rootPath, ManifestFileName);
        await SafeFileWriter.WriteAsync(manifestPath, Serialize(manifest), ct);

        EnsureCharactersFolder(rootPath);
        _logger.LogInformation("Created series '{Title}' at {RootPath}", request.Title, rootPath);

        return new Series
        {
            Id = manifest.Id,
            Title = manifest.Title,
            RootPath = rootPath,
            CreatedUtc = manifest.CreatedUtc,
            ModifiedUtc = manifest.ModifiedUtc,
        };
    }

    public async Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default)
    {
        if (!File.Exists(seriesFilePath))
            throw new ManifestNotFoundException(
                $"Series manifest not found: {seriesFilePath}");

        string json;
        try
        {
            json = await File.ReadAllTextAsync(seriesFilePath, ct);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            throw new ManifestNotFoundException(
                $"Could not read series manifest: {seriesFilePath}", ex);
        }

        SeriesManifest manifest;
        try
        {
            manifest = JsonSerializer.Deserialize<SeriesManifest>(json, JsonOptions)
                ?? throw new InvalidManifestException(
                    $"Series manifest deserialized to null: {seriesFilePath}");
        }
        catch (JsonException ex)
        {
            throw new InvalidManifestException(
                $"Series manifest contains invalid JSON: {seriesFilePath}", ex);
        }

        if (manifest.Version != SeriesManifest.CurrentVersion)
            _logger.LogWarning(
                "Series manifest version {Version} differs from expected {Expected}. File: {Path}",
                manifest.Version, SeriesManifest.CurrentVersion, seriesFilePath);

        var rootPath = Path.GetDirectoryName(seriesFilePath)
            ?? throw new InvalidManifestException(
                $"Could not determine root path from series manifest path: {seriesFilePath}");

        var series = new Series
        {
            Id = manifest.Id,
            Title = manifest.Title,
            RootPath = rootPath,
            CreatedUtc = manifest.CreatedUtc,
            ModifiedUtc = manifest.ModifiedUtc,
        };

        foreach (var entry in manifest.Books.OrderBy(b => b.SortOrder))
        {
            var bookManifestPath = Path.Combine(rootPath, entry.Folder, "book.tfbook");
            var book = await _bookStorage.OpenBookAsync(bookManifestPath, ct);
            series.Books.Add(book);
        }

        EnsureCharactersFolder(rootPath);
        _logger.LogInformation("Opened series '{Title}' with {Count} book(s)", series.Title, series.Books.Count);

        return series;
    }

    public async Task SaveSeriesAsync(Series series, CancellationToken ct = default)
    {
        series.ModifiedUtc = DateTimeOffset.UtcNow;

        var manifest = MapToManifest(series);
        var manifestPath = Path.Combine(series.RootPath, ManifestFileName);
        await SafeFileWriter.WriteAsync(manifestPath, Serialize(manifest), ct);

        _logger.LogDebug("Saved series manifest for '{Title}'", series.Title);
    }

    public async Task<BookProject> AddBookAsync(Series series, string title, CancellationToken ct = default)
    {
        TitleValidator.Validate(title, nameof(title));

        var book = await _bookStorage.CreateBookAsync(new CreateBookRequest
        {
            Title = title,
            ParentDirectory = series.RootPath,
        }, ct);

        series.Books.Add(book);
        await SaveSeriesAsync(series, ct);

        _logger.LogInformation("Added book '{Title}' to series '{Series}'", title, series.Title);

        return book;
    }

    public async Task RemoveBookAsync(Series series, Guid bookId, CancellationToken ct = default)
    {
        var book = series.Books.FirstOrDefault(b => b.Id == bookId)
            ?? throw new InvalidOperationException($"Book {bookId} not found in series '{series.Title}'.");

        series.Books.Remove(book);

        if (Directory.Exists(book.RootPath))
            Directory.Delete(book.RootPath, recursive: true);

        await SaveSeriesAsync(series, ct);
        _logger.LogInformation("Removed book '{Title}' from series '{Series}'", book.Title, series.Title);
    }

    private static SeriesManifest MapToManifest(Series series)
    {
        return new SeriesManifest
        {
            Id = series.Id,
            Title = series.Title,
            CreatedUtc = series.CreatedUtc,
            ModifiedUtc = series.ModifiedUtc,
            Books = series.Books
                .Select((b, i) => new BookEntry
                {
                    Id = b.Id,
                    Folder = Path.GetRelativePath(series.RootPath, b.RootPath),
                    SortOrder = i + 1,
                })
                .ToList(),
        };
    }

    private static string Serialize(SeriesManifest manifest) =>
        JsonSerializer.Serialize(manifest, JsonOptions);

    private static void EnsureCharactersFolder(string rootPath) =>
        Directory.CreateDirectory(Path.Combine(rootPath, "Characters"));
}
