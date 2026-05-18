using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;
using TextForge.Core.Requests;

namespace TextForge.Api.Services;

public sealed class BookWorkspaceService : IBookWorkspaceService
{
    private readonly IBookStorageService _storage;
    private BookProject? _currentBook;
    private readonly HashSet<Guid> _dirtyScenes = [];

    public BookWorkspaceService(IBookStorageService storage) => _storage = storage;

    public async Task<BookProject> CreateBookAsync(string title, string parentDirectory, CancellationToken ct = default)
    {
        _currentBook = await _storage.CreateBookAsync(
            new CreateBookRequest { Title = title, ParentDirectory = parentDirectory }, ct);
        _dirtyScenes.Clear();
        return _currentBook;
    }

    public async Task<BookProject> OpenBookAsync(string bookFilePath, CancellationToken ct = default)
    {
        _currentBook = await _storage.OpenBookAsync(bookFilePath, ct);
        _dirtyScenes.Clear();
        return _currentBook;
    }

    public BookProject? GetCurrentBook() => _currentBook;
    public void TrackDirtyScene(Guid sceneId) => _dirtyScenes.Add(sceneId);
    public void ClearDirtyScene(Guid sceneId) => _dirtyScenes.Remove(sceneId);
    public IReadOnlyCollection<Guid> GetDirtySceneIds() => _dirtyScenes;
}
