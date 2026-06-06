using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Controllers;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;
using TextForge.Core.Requests;
using TextForge.Versioning.Exceptions;
using TextForge.Versioning.Interfaces;
using TextForge.Versioning.Models;

namespace TextForge.Api.Tests;

public sealed class VersionsControllerTests
{
    // ── GetStatus ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetStatus_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.GetStatus(CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task GetStatus_WithNoSnapshots_ReturnsNullLatestSnapshot()
    {
        var versioning = new FakeVersioningService { CurrentBranch = "main" };
        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.GetStatus(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<VersionStatusDto>().Subject;
        dto.Branch.Should().Be("main");
        dto.LatestSnapshot.Should().BeNull();
    }

    [Fact]
    public async Task GetStatus_WithSnapshot_ReturnsSummary()
    {
        var snap = MakeSnapshot("v1");
        var versioning = new FakeVersioningService { CurrentBranch = "main", LatestSnapshot = snap };
        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.GetStatus(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<VersionStatusDto>().Subject;
        dto.LatestSnapshot.Should().NotBeNull();
        dto.LatestSnapshot!.Label.Should().Be("v1");
    }

    // ── TakeSnapshot ──────────────────────────────────────────────────────────

    [Fact]
    public async Task TakeSnapshot_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.TakeSnapshot(new TakeSnapshotBody("v1", null), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task TakeSnapshot_WithEmptyLabel_ReturnsBadRequest()
    {
        var sut = MakeSut(series: MakeSeries());

        var result = await sut.TakeSnapshot(new TakeSnapshotBody("", null), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Be("Snapshot label is required.");
    }

    [Fact]
    public async Task TakeSnapshot_WithWhitespaceLabel_ReturnsBadRequest()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.TakeSnapshot(new TakeSnapshotBody("   ", null), CancellationToken.None);
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task TakeSnapshot_WhenNoScenes_ReturnsBadRequest()
    {
        // Series with no books → GatherSceneContentsAsync returns empty dict
        var series = MakeSeries();
        var sut = MakeSut(series: series);

        var result = await sut.TakeSnapshot(new TakeSnapshotBody("v1", null), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Be("No scenes found to snapshot.");
    }

    [Fact]
    public async Task TakeSnapshot_WithScenes_ReturnsCreatedWithSummary()
    {
        var sceneId = Guid.NewGuid();
        var series = MakeSeriesWithScene(sceneId, "scene.md");
        var snap = MakeSnapshot("v1", sceneId);
        var versioning = new FakeVersioningService { NextSnapshot = snap };
        var bookStorage = new FakeBookStorage(sceneId, "Hello world");
        var sut = MakeSut(series: series, versioning: versioning, bookStorage: bookStorage);

        var result = await sut.TakeSnapshot(new TakeSnapshotBody("v1", "First cut"), CancellationToken.None);

        var created = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        created.Value.Should().BeOfType<SnapshotSummaryDto>()
            .Which.Label.Should().Be("v1");
        versioning.TakeSnapshotCalls.Should().Be(1);
        versioning.LastSnapshotContents.Should().ContainKey(sceneId);
    }

    // ── GetSnapshots (list) ───────────────────────────────────────────────────

    [Fact]
    public async Task GetSnapshots_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.GetSnapshots(null, 30, 0, CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task GetSnapshots_ClampsLimitTo100()
    {
        var versioning = new FakeVersioningService();
        versioning.History.AddRange(Enumerable.Range(0, 5).Select(i => MakeSnapshot($"v{i}")));
        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        await sut.GetSnapshots(null, limit: 500, offset: 0, CancellationToken.None);

        // Clamped limit=100, so fetch request was limit+offset+1 = 101
        versioning.LastHistoryLimit.Should().Be(101);
    }

    [Fact]
    public async Task GetSnapshots_HasMore_WhenMoreExistBeyondPage()
    {
        var versioning = new FakeVersioningService();
        // 3 snapshots total; limit=2 → HasMore=true
        versioning.History.AddRange(Enumerable.Range(0, 3).Select(i => MakeSnapshot($"v{i}")));
        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.GetSnapshots(null, limit: 2, offset: 0, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<SnapshotListDto>().Subject;
        dto.Snapshots.Should().HaveCount(2);
        dto.HasMore.Should().BeTrue();
    }

    [Fact]
    public async Task GetSnapshots_HasMore_FalseWhenExactPageSize()
    {
        var versioning = new FakeVersioningService();
        versioning.History.AddRange(Enumerable.Range(0, 2).Select(i => MakeSnapshot($"v{i}")));
        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.GetSnapshots(null, limit: 2, offset: 0, CancellationToken.None);

        var dto = result.Should().BeOfType<OkObjectResult>().Subject
            .Value.Should().BeOfType<SnapshotListDto>().Subject;
        dto.HasMore.Should().BeFalse();
    }

    // ── GetSnapshot (detail) ──────────────────────────────────────────────────

    [Fact]
    public async Task GetSnapshot_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.GetSnapshot(Guid.NewGuid(), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task GetSnapshot_WhenNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.GetSnapshot(Guid.NewGuid(), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetSnapshot_WithDiff_ReturnsDetailWithChanges()
    {
        var sceneId = Guid.NewGuid();
        var snap = MakeSnapshot("v1", sceneId);
        var diff = new SnapshotDiff
        {
            Added = [sceneId],
            Modified = [],
            Removed = [],
            Unchanged = [],
        };
        var series = MakeSeriesWithScene(sceneId, "scene.md");
        series.Books[0].Chapters[0].Scenes[0].Title = "Opening";
        var versioning = new FakeVersioningService { Diff = diff };
        versioning.Snapshots[snap.Id] = snap;
        var sut = MakeSut(series: series, versioning: versioning);

        var result = await sut.GetSnapshot(snap.Id, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<SnapshotDetailDto>().Subject;
        dto.Label.Should().Be("v1");
        dto.Changes.Should().ContainSingle(c => c.SceneId == sceneId && c.ChangeKind == "added" && c.SceneTitle == "Opening");
    }

    // ── GetBranches ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetBranches_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.GetBranches(CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task GetBranches_ReturnsBranchesWithCurrentFlag()
    {
        var versioning = new FakeVersioningService();
        versioning.Branches.Add(new Branch { Name = "main", IsCurrent = true });
        versioning.Branches.Add(new Branch { Name = "draft", IsCurrent = false });
        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.GetBranches(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dtos = ok.Value.Should().BeAssignableTo<IEnumerable<BranchDto>>().Subject.ToList();
        dtos.Should().HaveCount(2);
        dtos.Should().ContainSingle(b => b.Name == "main" && b.IsCurrent);
        dtos.Should().ContainSingle(b => b.Name == "draft" && !b.IsCurrent);
    }

    // ── CreateBranch ──────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateBranch_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.CreateBranch(new CreateBranchBody("feature", null), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task CreateBranch_WhenNameCollision_ReturnsConflict()
    {
        var versioning = new FakeVersioningService
        {
            CreateBranchException = new InvalidOperationException("Branch already exists."),
        };
        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.CreateBranch(new CreateBranchBody("main", null), CancellationToken.None);

        result.Should().BeOfType<ConflictObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Be("Branch already exists.");
    }

    [Fact]
    public async Task CreateBranch_WhenInvalidArgument_ReturnsBadRequest()
    {
        var versioning = new FakeVersioningService
        {
            CreateBranchException = new ArgumentException("Invalid branch name."),
        };
        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.CreateBranch(new CreateBranchBody("bad name", null), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Be("Invalid branch name.");
    }

    [Fact]
    public async Task CreateBranch_Success_ReturnsBranchDto()
    {
        var versioning = new FakeVersioningService
        {
            NewBranch = new Branch { Name = "feature", IsCurrent = false },
        };
        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.CreateBranch(new CreateBranchBody("feature", null), CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<BranchDto>().Which.Name.Should().Be("feature");
    }

    // ── SwitchBranch ──────────────────────────────────────────────────────────

    [Fact]
    public async Task SwitchBranch_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.SwitchBranch(new SwitchBranchBody("draft"), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task SwitchBranch_WhenBranchNotFound_ReturnsNotFound()
    {
        var versioning = new FakeVersioningService
        {
            SwitchBranchException = new InvalidOperationException("Branch not found."),
        };
        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.SwitchBranch(new SwitchBranchBody("missing"), CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Be("Branch not found.");
    }

    [Fact]
    public async Task SwitchBranch_Success_ReturnsNoContent()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.SwitchBranch(new SwitchBranchBody("main"), CancellationToken.None);
        result.Should().BeOfType<NoContentResult>();
    }

    // ── GetSceneHistory ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetSceneHistory_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.GetSceneHistory(Guid.NewGuid(), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task GetSceneHistory_OnlyIncludesSnapshotsWhereHashChanged()
    {
        var sceneId = Guid.NewGuid();

        // snap1 (root): hash "aaa" — included (no parent)
        // snap2: same hash "aaa" — excluded (no change)
        // snap3: hash "bbb" — included (changed)
        var snap1 = MakeSnapshot("v1", sceneId, hash: "aaa", parentId: null);
        var snap2 = MakeSnapshot("v2", sceneId, hash: "aaa", parentId: snap1.Id);
        var snap3 = MakeSnapshot("v3", sceneId, hash: "bbb", parentId: snap2.Id);

        var versioning = new FakeVersioningService();
        versioning.History.AddRange([snap1, snap2, snap3]);
        versioning.Snapshots[snap1.Id] = snap1;
        versioning.Snapshots[snap2.Id] = snap2;
        versioning.Snapshots[snap3.Id] = snap3;

        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.GetSceneHistory(sceneId, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dtos = ok.Value.Should().BeAssignableTo<IEnumerable<SnapshotSummaryDto>>().Subject.ToList();
        dtos.Should().HaveCount(2);
        dtos.Select(d => d.Label).Should().BeEquivalentTo(["v1", "v3"]);
    }

    [Fact]
    public async Task GetSceneHistory_WhenSceneNotInSnapshot_ExcludesIt()
    {
        var sceneId = Guid.NewGuid();
        var otherSceneId = Guid.NewGuid();
        // Snapshot only contains a different scene
        var snap = MakeSnapshot("v1", otherSceneId);
        var versioning = new FakeVersioningService();
        versioning.History.Add(snap);

        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.GetSceneHistory(sceneId, CancellationToken.None);

        var dtos = result.Should().BeOfType<OkObjectResult>().Subject
            .Value.Should().BeAssignableTo<IEnumerable<SnapshotSummaryDto>>().Subject;
        dtos.Should().BeEmpty();
    }

    // ── GetSceneAtSnapshot ────────────────────────────────────────────────────

    [Fact]
    public async Task GetSceneAtSnapshot_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.GetSceneAtSnapshot(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task GetSceneAtSnapshot_WhenSnapshotNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.GetSceneAtSnapshot(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetSceneAtSnapshot_ReturnsContentDto()
    {
        var sceneId = Guid.NewGuid();
        var snap = MakeSnapshot("v1", sceneId);
        var versioning = new FakeVersioningService { SceneContent = "Restored text" };
        versioning.Snapshots[snap.Id] = snap;
        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.GetSceneAtSnapshot(sceneId, snap.Id, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<SceneAtSnapshotDto>().Subject;
        dto.SceneId.Should().Be(sceneId);
        dto.SnapshotId.Should().Be(snap.Id);
        dto.Content.Should().Be("Restored text");
    }

    // ── RestoreScene ──────────────────────────────────────────────────────────

    [Fact]
    public async Task RestoreScene_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.RestoreScene(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task RestoreScene_WhenSceneNotInSeries_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries()); // series has no books/scenes
        var result = await sut.RestoreScene(Guid.NewGuid(), Guid.NewGuid(), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Contain("not found in the open series");
    }

    [Fact]
    public async Task RestoreScene_WhenSnapshotNotFound_ReturnsNotFound()
    {
        var sceneId = Guid.NewGuid();
        var series = MakeSeriesWithScene(sceneId, "scene.md");
        var versioning = new FakeVersioningService
        {
            RestoreSceneException = new SnapshotNotFoundException("Snapshot not found."),
        };
        var sut = MakeSut(series: series, versioning: versioning);

        var result = await sut.RestoreScene(sceneId, Guid.NewGuid(), CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Be("Snapshot not found.");
    }

    [Fact]
    public async Task RestoreScene_Success_ReturnsNoContent()
    {
        var sceneId = Guid.NewGuid();
        var series = MakeSeriesWithScene(sceneId, "scene.md");
        var sut = MakeSut(series: series);

        var result = await sut.RestoreScene(sceneId, Guid.NewGuid(), CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
    }

    // ── RestoreSnapshot ───────────────────────────────────────────────────────

    [Fact]
    public async Task RestoreSnapshot_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.RestoreSnapshot(Guid.NewGuid(), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task RestoreSnapshot_WhenSnapshotNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.RestoreSnapshot(Guid.NewGuid(), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task RestoreSnapshot_ReturnsRestoreResultDto()
    {
        var snap = MakeSnapshot("v1");
        var versioning = new FakeVersioningService
        {
            RestoreResult = new RestoreResult(3, ["missing.md"]),
        };
        versioning.Snapshots[snap.Id] = snap;
        var sut = MakeSut(series: MakeSeries(), versioning: versioning);

        var result = await sut.RestoreSnapshot(snap.Id, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<RestoreResultDto>().Subject;
        dto.Restored.Should().Be(3);
        dto.Skipped.Should().ContainSingle("missing.md");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static VersionsController MakeSut(
        Series? series,
        FakeVersioningService? versioning = null,
        FakeBookStorage? bookStorage = null) =>
        new(new FakeWorkspace(series), bookStorage ?? new FakeBookStorage(), versioning ?? new FakeVersioningService());

    private static Series MakeSeries() =>
        new() { RootPath = Path.GetTempPath(), Title = "Test Series" };

    private static Series MakeSeriesWithScene(Guid sceneId, string filePath)
    {
        var series = MakeSeries();
        var book = new BookProject { Id = Guid.NewGuid(), RootPath = series.RootPath };
        var chapter = new Chapter { Id = Guid.NewGuid() };
        chapter.Scenes.Add(new Scene { Id = sceneId, FilePath = filePath, Title = "Scene" });
        book.Chapters.Add(chapter);
        series.Books.Add(book);
        return series;
    }

    private static Snapshot MakeSnapshot(string label, Guid? sceneId = null, string hash = "abc123", Guid? parentId = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            Label = label,
            Branch = "main",
            TimestampUtc = DateTimeOffset.UtcNow,
            ParentId = parentId,
            Scenes = sceneId.HasValue
                ? new Dictionary<Guid, string> { [sceneId.Value] = hash }
                : new Dictionary<Guid, string>(),
        };

    private static void AssertNoSeries(IActionResult result) =>
        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Be("No series is open.");

    // ── Fakes ─────────────────────────────────────────────────────────────────

    private sealed class FakeWorkspace : ISeriesWorkspaceService
    {
        private readonly Series? _series;

        public FakeWorkspace(Series? series) => _series = series;

        public Series? GetCurrentSeries() => _series;

        public Task<Series> CreateSeriesAsync(string title, string parentDirectory, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> AddBookAsync(string title, CancellationToken ct = default) => throw new NotImplementedException();
        public Task RemoveBookAsync(Guid bookId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task SaveSeriesAsync(CancellationToken ct = default) => throw new NotImplementedException();
        public void CloseSeries() => throw new NotImplementedException();
        public BookProject? GetBook(Guid bookId) => throw new NotImplementedException();
        public BookProject? FindBookByScene(Guid sceneId) => throw new NotImplementedException();
        public void TrackDirtyScene(Guid sceneId) => throw new NotImplementedException();
        public void ClearDirtyScene(Guid sceneId) => throw new NotImplementedException();
        public IReadOnlyCollection<Guid> GetDirtySceneIds() => [];
    }

    private sealed class FakeBookStorage : IBookStorageService
    {
        private readonly Guid _sceneId;
        private readonly string _content;

        public FakeBookStorage(Guid sceneId = default, string content = "content") =>
            (_sceneId, _content) = (sceneId, content);

        public Task<Scene?> GetSceneAsync(BookProject book, Guid sceneId, CancellationToken ct = default)
        {
            if (sceneId == _sceneId)
                return Task.FromResult<Scene?>(new Scene { Id = sceneId, Content = _content });
            return Task.FromResult<Scene?>(null);
        }

        public Task<BookProject> CreateBookAsync(CreateBookRequest request, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> OpenBookAsync(string bookFilePath, CancellationToken ct = default) => throw new NotImplementedException();
        public Task SaveBookAsync(BookProject book, CancellationToken ct = default) => Task.CompletedTask;
        public Task SaveSceneContentAsync(BookProject book, Guid sceneId, string content, CancellationToken ct = default) => Task.CompletedTask;
    }

    private sealed class FakeVersioningService : IVersioningService
    {
        public string CurrentBranch { get; set; } = "main";
        public Snapshot? LatestSnapshot { get; set; }
        public Snapshot? NextSnapshot { get; set; }
        public List<Snapshot> History { get; } = [];
        public Dictionary<Guid, Snapshot> Snapshots { get; } = [];
        public List<Branch> Branches { get; } = [];
        public Branch? NewBranch { get; set; }
        public SnapshotDiff Diff { get; set; } = new() { Added = [], Modified = [], Removed = [], Unchanged = [] };
        public string? SceneContent { get; set; }
        public RestoreResult RestoreResult { get; set; } = new(0, []);
        public Exception? CreateBranchException { get; set; }
        public Exception? SwitchBranchException { get; set; }
        public Exception? RestoreSceneException { get; set; }

        public int TakeSnapshotCalls { get; private set; }
        public IReadOnlyDictionary<Guid, string> LastSnapshotContents { get; private set; } = new Dictionary<Guid, string>();
        public int LastHistoryLimit { get; private set; }

        public Task EnsureInitialisedAsync(string seriesRootPath, CancellationToken ct = default) => Task.CompletedTask;

        public Task<Snapshot> TakeSnapshotAsync(string seriesRootPath, string label, IReadOnlyDictionary<Guid, string> sceneContents, string message = "", CancellationToken ct = default)
        {
            TakeSnapshotCalls++;
            LastSnapshotContents = sceneContents;
            return Task.FromResult(NextSnapshot ?? MakeSnapshot(label));
        }

        public Task<Snapshot?> GetSnapshotAsync(string seriesRootPath, Guid snapshotId, CancellationToken ct = default) =>
            Task.FromResult(Snapshots.TryGetValue(snapshotId, out var s) ? s : null);

        public Task<IReadOnlyList<Snapshot>> GetHistoryAsync(string seriesRootPath, string? branchName = null, int limit = 50, CancellationToken ct = default)
        {
            LastHistoryLimit = limit;
            return Task.FromResult<IReadOnlyList<Snapshot>>(History);
        }

        public Task<SnapshotDiff> GetSnapshotDiffAsync(string seriesRootPath, Guid snapshotId, CancellationToken ct = default) =>
            Task.FromResult(Diff);

        public Task<string?> GetSceneContentAtSnapshotAsync(string seriesRootPath, Guid sceneId, Guid snapshotId, CancellationToken ct = default) =>
            Task.FromResult(SceneContent);

        public Task RestoreSceneAsync(string seriesRootPath, Guid sceneId, Guid snapshotId, string absoluteSceneFilePath, CancellationToken ct = default)
        {
            if (RestoreSceneException is not null) throw RestoreSceneException;
            return Task.CompletedTask;
        }

        public Task<RestoreResult> RestoreSnapshotAsync(string seriesRootPath, Guid snapshotId, IReadOnlyDictionary<Guid, string> sceneFilePaths, CancellationToken ct = default) =>
            Task.FromResult(RestoreResult);

        public Task<IReadOnlyList<Branch>> GetBranchesAsync(string seriesRootPath, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Branch>>(Branches);

        public Task<Branch> CreateBranchAsync(string seriesRootPath, string name, Guid? fromSnapshotId = null, CancellationToken ct = default)
        {
            if (CreateBranchException is not null) throw CreateBranchException;
            return Task.FromResult(NewBranch ?? new Branch { Name = name });
        }

        public Task SwitchBranchAsync(string seriesRootPath, string branchName, CancellationToken ct = default)
        {
            if (SwitchBranchException is not null) throw SwitchBranchException;
            return Task.CompletedTask;
        }

        public Task<string> GetCurrentBranchAsync(string seriesRootPath, CancellationToken ct = default) =>
            Task.FromResult(CurrentBranch);

        public Task<Snapshot?> GetLatestSnapshotAsync(string seriesRootPath, CancellationToken ct = default) =>
            Task.FromResult(LatestSnapshot);
    }
}
