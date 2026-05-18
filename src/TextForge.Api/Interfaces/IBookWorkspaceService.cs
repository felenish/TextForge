using TextForge.Core.Models;

namespace TextForge.Api.Interfaces;

public interface IBookWorkspaceService
{
    Task<BookProject> CreateBookAsync(string title, string parentDirectory, CancellationToken ct = default);
    Task<BookProject> OpenBookAsync(string bookFilePath, CancellationToken ct = default);
    BookProject? GetCurrentBook();
    void TrackDirtyScene(Guid sceneId);
    void ClearDirtyScene(Guid sceneId);
    IReadOnlyCollection<Guid> GetDirtySceneIds();
}
