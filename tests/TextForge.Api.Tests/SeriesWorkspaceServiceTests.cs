using FluentAssertions;
using TextForge.Api.Interfaces;
using TextForge.Api.Services;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;
using TextForge.Core.Requests;
using TextForge.Versioning.Interfaces;
using TextForge.Versioning.Models;

namespace TextForge.Api.Tests;

public sealed class SeriesWorkspaceServiceTests
{
    [Fact]
    public async Task CreateSeriesAsync_ClearsDirtyScenes_AndTracksRecentManifestPath()
    {
        var created = new Series
        {
            Id = Guid.NewGuid(),
            Title = "My Series",
            RootPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N")),
        };

        var storage = new FakeSeriesStorage { CreateResult = created };
        var appSettings = new FakeAppSettingsService();
        var versioning = new FakeVersioningService();
        var sut = new SeriesWorkspaceService(storage, appSettings, versioning);

        sut.TrackDirtyScene(Guid.NewGuid());

        var result = await sut.CreateSeriesAsync("My Series", "C:/SeriesRoot", CancellationToken.None);

        result.Should().BeSameAs(created);
        sut.GetCurrentSeries().Should().BeSameAs(created);
        sut.GetDirtySceneIds().Should().BeEmpty();
        versioning.InitialisedRootPaths.Should().ContainSingle(created.RootPath);
        appSettings.RecentEntries.Should().ContainSingle();
        appSettings.RecentEntries[0].Title.Should().Be("My Series");
        appSettings.RecentEntries[0].Path.Should().Be(Path.Combine(created.RootPath, "series.tfseries"));
    }

    [Fact]
    public async Task OpenSeriesAsync_TracksRecentPath_AndClearsDirtyState()
    {
        var opened = new Series
        {
            Id = Guid.NewGuid(),
            Title = "Opened",
            RootPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N")),
        };

        var storage = new FakeSeriesStorage { OpenResult = opened };
        var appSettings = new FakeAppSettingsService();
        var versioning = new FakeVersioningService();
        var sut = new SeriesWorkspaceService(storage, appSettings, versioning);

        sut.TrackDirtyScene(Guid.NewGuid());
        var seriesFilePath = Path.Combine(opened.RootPath, "series.tfseries");

        var result = await sut.OpenSeriesAsync(seriesFilePath, CancellationToken.None);

        result.Should().BeSameAs(opened);
        sut.GetDirtySceneIds().Should().BeEmpty();
        versioning.InitialisedRootPaths.Should().ContainSingle(opened.RootPath);
        appSettings.RecentEntries.Should().ContainSingle();
        appSettings.RecentEntries[0].Should().Be(new RecentSeriesEntry("Opened", seriesFilePath));
    }

    [Fact]
    public async Task CloseSeries_ClearsCurrentSeries_AndDirtySceneTracking()
    {
        var opened = new Series
        {
            Id = Guid.NewGuid(),
            Title = "Opened",
            RootPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N")),
        };

        var storage = new FakeSeriesStorage { OpenResult = opened };
        var sut = new SeriesWorkspaceService(storage, new FakeAppSettingsService(), new FakeVersioningService());

        await sut.OpenSeriesAsync(Path.Combine(opened.RootPath, "series.tfseries"), CancellationToken.None);
        var dirtySceneId = Guid.NewGuid();
        sut.TrackDirtyScene(dirtySceneId);

        sut.CloseSeries();

        sut.GetCurrentSeries().Should().BeNull();
        sut.GetDirtySceneIds().Should().BeEmpty();
    }

    private sealed class FakeSeriesStorage : ISeriesStorageService
    {
        public Series CreateResult { get; set; } = new();
        public Series OpenResult { get; set; } = new();

        public Task<Series> CreateSeriesAsync(CreateSeriesRequest request, CancellationToken ct = default)
            => Task.FromResult(CreateResult);

        public Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default)
            => Task.FromResult(OpenResult);

        public Task SaveSeriesAsync(Series series, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task<BookProject> AddBookAsync(Series series, string title, CancellationToken ct = default)
            => Task.FromResult(new BookProject());

        public Task RemoveBookAsync(Series series, Guid bookId, CancellationToken ct = default)
            => Task.CompletedTask;
    }

    private sealed class FakeAppSettingsService : IAppSettingsService
    {
        public List<RecentSeriesEntry> RecentEntries { get; } = [];

        public Task<IReadOnlyList<RecentSeriesEntry>> GetRecentSeriesAsync(CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<RecentSeriesEntry>>(RecentEntries);

        public Task AddRecentSeriesAsync(string title, string path, CancellationToken ct = default)
        {
            RecentEntries.Add(new RecentSeriesEntry(title, path));
            return Task.CompletedTask;
        }

        public Task<AiConfig?> GetAiConfigAsync(CancellationToken ct = default)
            => Task.FromResult<AiConfig?>(null);

        public Task SetAiConfigAsync(AiConfig config, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task<UiPreferences> GetUiPreferencesAsync(CancellationToken ct = default)
            => Task.FromResult(new UiPreferences());

        public Task SetUiPreferencesAsync(UiPreferences prefs, CancellationToken ct = default)
            => Task.CompletedTask;
    }

    private sealed class FakeVersioningService : IVersioningService
    {
        public List<string> InitialisedRootPaths { get; } = [];

        public Task EnsureInitialisedAsync(string seriesRootPath, CancellationToken ct = default)
        {
            InitialisedRootPaths.Add(seriesRootPath);
            return Task.CompletedTask;
        }

        public Task<Snapshot> TakeSnapshotAsync(string seriesRootPath, string label, IReadOnlyDictionary<Guid, string> sceneContents, string message = "", CancellationToken ct = default)
            => throw new NotImplementedException();

        public Task<Snapshot?> GetSnapshotAsync(string seriesRootPath, Guid snapshotId, CancellationToken ct = default)
            => throw new NotImplementedException();

        public Task<IReadOnlyList<Snapshot>> GetHistoryAsync(string seriesRootPath, string? branchName = null, int limit = 50, CancellationToken ct = default)
            => throw new NotImplementedException();

        public Task<SnapshotDiff> GetSnapshotDiffAsync(string seriesRootPath, Guid snapshotId, CancellationToken ct = default)
            => throw new NotImplementedException();

        public Task<string?> GetSceneContentAtSnapshotAsync(string seriesRootPath, Guid sceneId, Guid snapshotId, CancellationToken ct = default)
            => throw new NotImplementedException();

        public Task RestoreSceneAsync(string seriesRootPath, Guid sceneId, Guid snapshotId, string absoluteSceneFilePath, CancellationToken ct = default)
            => throw new NotImplementedException();

        public Task<RestoreResult> RestoreSnapshotAsync(string seriesRootPath, Guid snapshotId, IReadOnlyDictionary<Guid, string> sceneFilePaths, CancellationToken ct = default)
            => throw new NotImplementedException();

        public Task<IReadOnlyList<Branch>> GetBranchesAsync(string seriesRootPath, CancellationToken ct = default)
            => throw new NotImplementedException();

        public Task<Branch> CreateBranchAsync(string seriesRootPath, string name, Guid? fromSnapshotId = null, CancellationToken ct = default)
            => throw new NotImplementedException();

        public Task SwitchBranchAsync(string seriesRootPath, string branchName, CancellationToken ct = default)
            => throw new NotImplementedException();

        public Task<string> GetCurrentBranchAsync(string seriesRootPath, CancellationToken ct = default)
            => throw new NotImplementedException();

        public Task<Snapshot?> GetLatestSnapshotAsync(string seriesRootPath, CancellationToken ct = default)
            => throw new NotImplementedException();
    }
}
