using Microsoft.Extensions.Logging;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;
using TextForge.Export.Interfaces;
using TextForge.Export.Models;

namespace TextForge.Export.Services;

public sealed class ExportService : IExportService
{
    private readonly IBookStorageService _bookStorage;
    private readonly ILogger<ExportService> _logger;

    public ExportService(IBookStorageService bookStorage, ILogger<ExportService> logger)
    {
        _bookStorage = bookStorage;
        _logger = logger;
    }

    public async Task ExportAsync(Series series, ExportOptions options, string outputPath, CancellationToken ct = default)
    {
        var books = options.BookIds is null
            ? series.Books
            : series.Books.Where(b => options.BookIds.Contains(b.Id)).ToList();

        var content = await LoadSceneContentAsync(books, ct);

        _logger.LogInformation("Exporting {Format} to {Path} ({Books} books, {Scenes} scenes)",
            options.Format, outputPath, books.Count, content.Count);

        if (options.Format == ExportFormat.Epub)
            await EpubExporter.ExportAsync(books, options, content, outputPath, ct);
        else
            PdfExporter.Export(books, options, content, outputPath);
    }

    private async Task<Dictionary<Guid, string>> LoadSceneContentAsync(
        IEnumerable<BookProject> books, CancellationToken ct)
    {
        var result = new Dictionary<Guid, string>();
        foreach (var book in books)
        {
            foreach (var chapter in book.Chapters)
            {
                foreach (var scene in chapter.Scenes)
                {
                    ct.ThrowIfCancellationRequested();
                    try
                    {
                        var loaded = await _bookStorage.GetSceneAsync(book, scene.Id, ct);
                        result[scene.Id] = loaded?.Content ?? string.Empty;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Could not load content for scene {SceneId}; skipping", scene.Id);
                        result[scene.Id] = string.Empty;
                    }
                }
            }
        }
        return result;
    }
}
