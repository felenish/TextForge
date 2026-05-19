using TextForge.Core.Models;
using TextForge.Core.Requests;

namespace TextForge.Api.Interfaces;

public interface ISeriesWorkspaceService
{
    Task<Series> CreateSeriesAsync(string title, string parentDirectory, CancellationToken ct = default);
    Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default);
    Task<BookProject> AddBookAsync(string title, CancellationToken ct = default);
    Task RemoveBookAsync(Guid bookId, CancellationToken ct = default);
    Series? GetCurrentSeries();
    BookProject? GetBook(Guid bookId);
    BookProject? FindBookByScene(Guid sceneId);
    void TrackDirtyScene(Guid sceneId);
    void ClearDirtyScene(Guid sceneId);
    IReadOnlyCollection<Guid> GetDirtySceneIds();
}
