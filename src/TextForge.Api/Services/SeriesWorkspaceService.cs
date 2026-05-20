using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;
using TextForge.Core.Requests;
using TextForge.Versioning.Interfaces;

namespace TextForge.Api.Services;

public sealed class SeriesWorkspaceService : ISeriesWorkspaceService
{
    private readonly ISeriesStorageService _storage;
    private readonly IAppSettingsService _appSettings;
    private readonly IVersioningService _versioning;
    private Series? _currentSeries;
    private readonly HashSet<Guid> _dirtyScenes = [];

    public SeriesWorkspaceService(
        ISeriesStorageService storage,
        IAppSettingsService appSettings,
        IVersioningService versioning)
    {
        _storage = storage;
        _appSettings = appSettings;
        _versioning = versioning;
    }

    private const string ManifestFileName = "series.tfseries";

    public async Task<Series> CreateSeriesAsync(string title, string parentDirectory, CancellationToken ct = default)
    {
        _currentSeries = await _storage.CreateSeriesAsync(
            new CreateSeriesRequest { Title = title, ParentDirectory = parentDirectory }, ct);
        _dirtyScenes.Clear();
        await _versioning.EnsureInitialisedAsync(_currentSeries.RootPath, ct);
        var manifestPath = Path.Combine(_currentSeries.RootPath, ManifestFileName);
        await _appSettings.AddRecentSeriesAsync(_currentSeries.Title, manifestPath, ct);
        return _currentSeries;
    }

    public async Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default)
    {
        _currentSeries = await _storage.OpenSeriesAsync(seriesFilePath, ct);
        _dirtyScenes.Clear();
        await _versioning.EnsureInitialisedAsync(_currentSeries.RootPath, ct);
        // TODO(post-MVP): Consider auto-snapshotting on series open to preserve state before edits.
        await _appSettings.AddRecentSeriesAsync(_currentSeries.Title, seriesFilePath, ct);
        return _currentSeries;
    }

    public async Task<BookProject> AddBookAsync(string title, CancellationToken ct = default)
    {
        if (_currentSeries is null)
            throw new InvalidOperationException("No series is open.");
        return await _storage.AddBookAsync(_currentSeries, title, ct);
    }

    public async Task RemoveBookAsync(Guid bookId, CancellationToken ct = default)
    {
        if (_currentSeries is null)
            throw new InvalidOperationException("No series is open.");
        await _storage.RemoveBookAsync(_currentSeries, bookId, ct);
    }

    public Series? GetCurrentSeries() => _currentSeries;

    public async Task SaveSeriesAsync(CancellationToken ct = default)
    {
        if (_currentSeries is null)
            throw new InvalidOperationException("No series is open.");
        await _storage.SaveSeriesAsync(_currentSeries, ct);
    }

    public void CloseSeries()
    {
        _currentSeries = null;
        _dirtyScenes.Clear();
    }

    public BookProject? GetBook(Guid bookId)
        => _currentSeries?.Books.FirstOrDefault(b => b.Id == bookId);

    public BookProject? FindBookByScene(Guid sceneId)
        => _currentSeries?.Books.FirstOrDefault(b =>
            b.Chapters.Any(c => c.Scenes.Any(s => s.Id == sceneId)));

    public void TrackDirtyScene(Guid sceneId) => _dirtyScenes.Add(sceneId);
    public void ClearDirtyScene(Guid sceneId) => _dirtyScenes.Remove(sceneId);
    public IReadOnlyCollection<Guid> GetDirtySceneIds() => _dirtyScenes;
}
