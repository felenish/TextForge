using TextForge.Core.Models;
using TextForge.Core.Requests;

namespace TextForge.Core.Interfaces;

public interface ISeriesStorageService
{
    /// <summary>Creates a new series folder on disk and returns the populated domain model.</summary>
    Task<Series> CreateSeriesAsync(CreateSeriesRequest request, CancellationToken ct = default);

    /// <summary>Opens an existing series from its <c>series.tfseries</c> manifest path.</summary>
    Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default);

    /// <summary>Persists the series manifest to disk.</summary>
    Task SaveSeriesAsync(Series series, CancellationToken ct = default);

    /// <summary>
    /// Creates a new book subfolder inside the series, adds it to the series, and saves the manifest.
    /// Returns the newly created <see cref="BookProject"/>.
    /// </summary>
    Task<BookProject> AddBookAsync(Series series, string title, CancellationToken ct = default);

    /// <summary>
    /// Removes the specified book from the series, deletes its folder, and saves the manifest.
    /// </summary>
    Task RemoveBookAsync(Series series, Guid bookId, CancellationToken ct = default);
}
