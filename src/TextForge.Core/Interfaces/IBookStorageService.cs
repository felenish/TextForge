using TextForge.Core.Models;
using TextForge.Core.Requests;

namespace TextForge.Core.Interfaces;

public interface IBookStorageService
{
    /// <summary>Creates a new book project on disk and returns the populated domain model.</summary>
    Task<BookProject> CreateBookAsync(CreateBookRequest request, CancellationToken ct = default);

    /// <summary>Opens an existing book from its <c>book.tfbook</c> manifest path.</summary>
    Task<BookProject> OpenBookAsync(string bookFilePath, CancellationToken ct = default);

    /// <summary>Persists the book manifest and any dirty scene files to disk.</summary>
    Task SaveBookAsync(BookProject book, CancellationToken ct = default);

    /// <summary>
    /// Loads scene content from its <c>.md</c> file.
    /// Returns <c>null</c> if no scene with <paramref name="sceneId"/> exists in the book.
    /// </summary>
    Task<Scene?> GetSceneAsync(BookProject book, Guid sceneId, CancellationToken ct = default);

    /// <summary>Writes updated content for a single scene to its <c>.md</c> file.</summary>
    Task SaveSceneContentAsync(BookProject book, Guid sceneId, string content, CancellationToken ct = default);
}
