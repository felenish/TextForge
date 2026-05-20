using Microsoft.Extensions.Logging.Abstractions;
using TextForge.Versioning.Exceptions;
using TextForge.Versioning.Services;

namespace TextForge.Versioning.Tests;

public sealed class VersioningServiceTests : IAsyncLifetime
{
    private readonly string _root;
    private readonly VersioningService _svc;

    public VersioningServiceTests()
    {
        _root = Path.Combine(Path.GetTempPath(), $"tfv-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_root);
        _svc = new VersioningService(NullLogger<VersioningService>.Instance);
    }

    public Task InitializeAsync() => _svc.EnsureInitialisedAsync(_root);

    public Task DisposeAsync()
    {
        if (Directory.Exists(_root))
            Directory.Delete(_root, recursive: true);
        return Task.CompletedTask;
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private static Dictionary<Guid, string> Scenes(params (Guid id, string content)[] pairs) =>
        pairs.ToDictionary(p => p.id, p => p.content);

    // ── EnsureInitialised ────────────────────────────────────────────────

    [Fact]
    public async Task EnsureInitialisedAsync_IsIdempotent()
    {
        // Calling twice must not throw or corrupt state
        await _svc.EnsureInitialisedAsync(_root);

        Directory.Exists(Path.Combine(_root, ".textforge")).Should().BeTrue();
        File.Exists(Path.Combine(_root, ".textforge", "HEAD")).Should().BeTrue();
        File.Exists(Path.Combine(_root, ".textforge", "refs", "branches", "main")).Should().BeTrue();
    }

    // ── TakeSnapshot ─────────────────────────────────────────────────────

    [Fact]
    public async Task TakeSnapshotAsync_CreatesSnapshotFile()
    {
        var sceneId = Guid.NewGuid();
        var snapshot = await _svc.TakeSnapshotAsync(_root, "Initial", Scenes((sceneId, "Hello world")));

        var snapshotPath = Path.Combine(_root, ".textforge", "snapshots", $"{snapshot.Id}.json");
        File.Exists(snapshotPath).Should().BeTrue();
    }

    [Fact]
    public async Task TakeSnapshotAsync_WritesBlobs_ForAllScenes()
    {
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        await _svc.TakeSnapshotAsync(_root, "v1", Scenes((id1, "content A"), (id2, "content B")));

        var objectsDir = Path.Combine(_root, ".textforge", "objects");
        var blobFiles = Directory.GetFiles(objectsDir, "*", SearchOption.AllDirectories);
        blobFiles.Length.Should().Be(2);
    }

    [Fact]
    public async Task TakeSnapshotAsync_DeduplicatesBlobs()
    {
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        await _svc.TakeSnapshotAsync(_root, "v1", Scenes((id1, "same content"), (id2, "same content")));

        var objectsDir = Path.Combine(_root, ".textforge", "objects");
        var blobFiles = Directory.GetFiles(objectsDir, "*", SearchOption.AllDirectories);
        blobFiles.Length.Should().Be(1);
    }

    [Fact]
    public async Task TakeSnapshotAsync_UpdatesBranchTip()
    {
        var sceneId = Guid.NewGuid();
        var snapshot = await _svc.TakeSnapshotAsync(_root, "v1", Scenes((sceneId, "text")));

        var tipRaw = await File.ReadAllTextAsync(
            Path.Combine(_root, ".textforge", "refs", "branches", "main"));
        tipRaw.Trim().Should().Be(snapshot.Id.ToString());
    }

    [Fact]
    public async Task TakeSnapshotAsync_SetsParentId_FromPreviousSnapshot()
    {
        var sceneId = Guid.NewGuid();
        var first = await _svc.TakeSnapshotAsync(_root, "v1", Scenes((sceneId, "v1")));
        var second = await _svc.TakeSnapshotAsync(_root, "v2", Scenes((sceneId, "v2")));

        second.ParentId.Should().Be(first.Id);
    }

    [Fact]
    public async Task TakeSnapshotAsync_ThrowsOnEmptyLabel()
    {
        var act = async () => await _svc.TakeSnapshotAsync(_root, "  ", Scenes((Guid.NewGuid(), "x")));
        await act.Should().ThrowAsync<ArgumentException>();
    }

    // ── GetHistory ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetHistoryAsync_ReturnsSnapshotsInReverseChronologicalOrder()
    {
        var id = Guid.NewGuid();
        var s1 = await _svc.TakeSnapshotAsync(_root, "first", Scenes((id, "a")));
        var s2 = await _svc.TakeSnapshotAsync(_root, "second", Scenes((id, "b")));
        var s3 = await _svc.TakeSnapshotAsync(_root, "third", Scenes((id, "c")));

        var history = await _svc.GetHistoryAsync(_root);

        history.Should().HaveCount(3);
        history[0].Id.Should().Be(s3.Id);
        history[1].Id.Should().Be(s2.Id);
        history[2].Id.Should().Be(s1.Id);
    }

    [Fact]
    public async Task GetHistoryAsync_RespectsLimit()
    {
        var id = Guid.NewGuid();
        for (var i = 0; i < 5; i++)
            await _svc.TakeSnapshotAsync(_root, $"snap {i}", Scenes((id, $"content {i}")));

        var history = await _svc.GetHistoryAsync(_root, limit: 2);
        history.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetHistoryAsync_ReturnsEmptyForBranchWithNoSnapshots()
    {
        await _svc.CreateBranchAsync(_root, "empty-branch");
        var history = await _svc.GetHistoryAsync(_root, "empty-branch");
        history.Should().BeEmpty();
    }

    // ── GetSnapshotDiff ───────────────────────────────────────────────────

    [Fact]
    public async Task GetSnapshotDiffAsync_IdentifiesModifiedScenes()
    {
        var id = Guid.NewGuid();
        await _svc.TakeSnapshotAsync(_root, "v1", Scenes((id, "original")));
        var v2 = await _svc.TakeSnapshotAsync(_root, "v2", Scenes((id, "modified")));

        var diff = await _svc.GetSnapshotDiffAsync(_root, v2.Id);
        diff.Modified.Should().Contain(id);
        diff.Added.Should().BeEmpty();
        diff.Removed.Should().BeEmpty();
    }

    [Fact]
    public async Task GetSnapshotDiffAsync_IdentifiesAddedScenes()
    {
        var existing = Guid.NewGuid();
        var newScene = Guid.NewGuid();
        await _svc.TakeSnapshotAsync(_root, "v1", Scenes((existing, "text")));
        var v2 = await _svc.TakeSnapshotAsync(_root, "v2", Scenes((existing, "text"), (newScene, "new")));

        var diff = await _svc.GetSnapshotDiffAsync(_root, v2.Id);
        diff.Added.Should().Contain(newScene);
        diff.Unchanged.Should().Contain(existing);
    }

    [Fact]
    public async Task GetSnapshotDiffAsync_IdentifiesRemovedScenes()
    {
        var kept = Guid.NewGuid();
        var removed = Guid.NewGuid();
        await _svc.TakeSnapshotAsync(_root, "v1", Scenes((kept, "a"), (removed, "b")));
        var v2 = await _svc.TakeSnapshotAsync(_root, "v2", Scenes((kept, "a")));

        var diff = await _svc.GetSnapshotDiffAsync(_root, v2.Id);
        diff.Removed.Should().Contain(removed);
    }

    [Fact]
    public async Task GetSnapshotDiffAsync_AllScenesAddedForFirstSnapshot()
    {
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var snap = await _svc.TakeSnapshotAsync(_root, "first", Scenes((id1, "a"), (id2, "b")));

        var diff = await _svc.GetSnapshotDiffAsync(_root, snap.Id);
        diff.Added.Should().Contain(id1).And.Contain(id2);
        diff.Modified.Should().BeEmpty();
        diff.Removed.Should().BeEmpty();
    }

    // ── GetSceneContentAtSnapshot ─────────────────────────────────────────

    [Fact]
    public async Task GetSceneContentAtSnapshotAsync_ReturnsCorrectContent()
    {
        var id = Guid.NewGuid();
        var snap = await _svc.TakeSnapshotAsync(_root, "v1", Scenes((id, "Hello, world!")));

        var content = await _svc.GetSceneContentAtSnapshotAsync(_root, id, snap.Id);
        content.Should().Be("Hello, world!");
    }

    [Fact]
    public async Task GetSceneContentAtSnapshotAsync_ReturnsNull_WhenSceneNotInSnapshot()
    {
        var id = Guid.NewGuid();
        var snap = await _svc.TakeSnapshotAsync(_root, "v1", Scenes((id, "text")));

        var content = await _svc.GetSceneContentAtSnapshotAsync(_root, Guid.NewGuid(), snap.Id);
        content.Should().BeNull();
    }

    // ── RestoreScene ──────────────────────────────────────────────────────

    [Fact]
    public async Task RestoreSceneAsync_WritesCorrectContentToDisk()
    {
        var sceneId = Guid.NewGuid();
        var snap = await _svc.TakeSnapshotAsync(_root, "v1", Scenes((sceneId, "original text")));

        var filePath = Path.Combine(_root, "scene.txt");
        await File.WriteAllTextAsync(filePath, "modified text");

        await _svc.RestoreSceneAsync(_root, sceneId, snap.Id, filePath);

        (await File.ReadAllTextAsync(filePath)).Should().Be("original text");
    }

    [Fact]
    public async Task RestoreSceneAsync_Throws_WhenSceneNotInSnapshot()
    {
        var snap = await _svc.TakeSnapshotAsync(_root, "v1", Scenes((Guid.NewGuid(), "x")));

        var act = async () => await _svc.RestoreSceneAsync(
            _root, Guid.NewGuid(), snap.Id, Path.Combine(_root, "x.txt"));

        await act.Should().ThrowAsync<SnapshotNotFoundException>();
    }

    // ── RestoreSnapshot ───────────────────────────────────────────────────

    [Fact]
    public async Task RestoreSnapshotAsync_RestoresAllScenes()
    {
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var snap = await _svc.TakeSnapshotAsync(_root, "v1",
            Scenes((id1, "scene 1 original"), (id2, "scene 2 original")));

        // Modify the files after snapshotting
        var file1 = Path.Combine(_root, "s1.txt");
        var file2 = Path.Combine(_root, "s2.txt");
        await File.WriteAllTextAsync(file1, "modified 1");
        await File.WriteAllTextAsync(file2, "modified 2");

        var result = await _svc.RestoreSnapshotAsync(_root, snap.Id,
            new Dictionary<Guid, string> { [id1] = file1, [id2] = file2 });

        (await File.ReadAllTextAsync(file1)).Should().Be("scene 1 original");
        (await File.ReadAllTextAsync(file2)).Should().Be("scene 2 original");
        result.Restored.Should().Be(2);
        result.Skipped.Should().BeEmpty();
    }

    [Fact]
    public async Task RestoreSnapshotAsync_ReportsSkipped_WhenSceneNotInSnapshot()
    {
        var id1 = Guid.NewGuid();
        var unknownId = Guid.NewGuid();
        var snap = await _svc.TakeSnapshotAsync(_root, "v1", Scenes((id1, "original")));

        var file1 = Path.Combine(_root, "s1.txt");
        var fileUnknown = Path.Combine(_root, "unknown.txt");
        await File.WriteAllTextAsync(file1, "modified");

        var result = await _svc.RestoreSnapshotAsync(_root, snap.Id,
            new Dictionary<Guid, string> { [id1] = file1, [unknownId] = fileUnknown });

        result.Restored.Should().Be(1);
        result.Skipped.Should().HaveCount(1);
        (await File.ReadAllTextAsync(file1)).Should().Be("original");
    }

    // ── Branches ──────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateBranchAsync_CreatesBranchFile()
    {
        await _svc.CreateBranchAsync(_root, "feature-branch");

        File.Exists(Path.Combine(_root, ".textforge", "refs", "branches", "feature-branch"))
            .Should().BeTrue();
    }

    [Fact]
    public async Task CreateBranchAsync_ThrowsOnInvalidName()
    {
        var act = async () => await _svc.CreateBranchAsync(_root, "invalid name");
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateBranchAsync_ThrowsOnDuplicateName()
    {
        await _svc.CreateBranchAsync(_root, "dupe");
        var act = async () => await _svc.CreateBranchAsync(_root, "dupe");
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task SwitchBranchAsync_UpdatesHEAD()
    {
        await _svc.CreateBranchAsync(_root, "other");
        await _svc.SwitchBranchAsync(_root, "other");

        var current = await _svc.GetCurrentBranchAsync(_root);
        current.Should().Be("other");
    }

    [Fact]
    public async Task SwitchBranchAsync_Throws_WhenBranchDoesNotExist()
    {
        var act = async () => await _svc.SwitchBranchAsync(_root, "nonexistent");
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task GetBranchesAsync_ReturnsAllBranches_WithCurrentFlag()
    {
        await _svc.CreateBranchAsync(_root, "branch-b");

        var branches = await _svc.GetBranchesAsync(_root);
        branches.Should().HaveCount(2);

        var main = branches.Single(b => b.Name == "main");
        main.IsCurrent.Should().BeTrue();

        var branchB = branches.Single(b => b.Name == "branch-b");
        branchB.IsCurrent.Should().BeFalse();
    }

    // ── GetLatestSnapshot ─────────────────────────────────────────────────

    [Fact]
    public async Task GetLatestSnapshotAsync_ReturnsNullOnFreshSeries()
    {
        var latest = await _svc.GetLatestSnapshotAsync(_root);
        latest.Should().BeNull();
    }

    [Fact]
    public async Task GetLatestSnapshotAsync_ReturnsMostRecentSnapshot()
    {
        var id = Guid.NewGuid();
        await _svc.TakeSnapshotAsync(_root, "first", Scenes((id, "a")));
        var second = await _svc.TakeSnapshotAsync(_root, "second", Scenes((id, "b")));

        var latest = await _svc.GetLatestSnapshotAsync(_root);
        latest!.Id.Should().Be(second.Id);
    }
}
