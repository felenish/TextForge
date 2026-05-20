using Microsoft.Extensions.Logging;
using TextForge.Core.Utilities;
using TextForge.Versioning.Exceptions;
using TextForge.Versioning.Interfaces;
using TextForge.Versioning.Models;
using TextForge.Versioning.Services.Internal;
using TextForge.Versioning.Utilities;

namespace TextForge.Versioning.Services;

public sealed class VersioningService : IVersioningService
{
    private readonly ObjectStore _objects;
    private readonly SnapshotStore _snapshots;
    private readonly RefStore _refs;
    private readonly ILogger<VersioningService> _logger;

    public VersioningService(ILogger<VersioningService> logger)
    {
        _logger = logger;
        _objects = new ObjectStore();
        _snapshots = new SnapshotStore(logger);
        _refs = new RefStore();
    }

    public async Task EnsureInitialisedAsync(string seriesRootPath, CancellationToken ct = default)
    {
        var tfDir = Path.Combine(seriesRootPath, ".textforge");
        Directory.CreateDirectory(tfDir);
        Directory.CreateDirectory(Path.Combine(tfDir, "refs", "branches"));
        Directory.CreateDirectory(Path.Combine(tfDir, "objects"));
        Directory.CreateDirectory(Path.Combine(tfDir, "snapshots"));

        var headPath = Path.Combine(tfDir, "HEAD");
        if (!File.Exists(headPath))
            await SafeFileWriter.WriteAsync(headPath, "ref: refs/branches/main", ct);

        var mainBranchPath = Path.Combine(tfDir, "refs", "branches", "main");
        if (!File.Exists(mainBranchPath))
            await File.WriteAllTextAsync(mainBranchPath, string.Empty, ct);
    }

    public async Task<Snapshot> TakeSnapshotAsync(
        string seriesRootPath,
        string label,
        IReadOnlyDictionary<Guid, string> sceneContents,
        string message = "",
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(label))
            throw new ArgumentException("Snapshot label must not be empty.", nameof(label));

        var branch = await _refs.ReadHeadAsync(seriesRootPath, ct);
        var parentId = await _refs.ReadBranchTipAsync(seriesRootPath, branch, ct);

        var sceneTree = new Dictionary<Guid, string>(sceneContents.Count);
        foreach (var (sceneId, content) in sceneContents)
        {
            var hash = _objects.ComputeHash(content);
            await _objects.WriteBlobAsync(seriesRootPath, hash, content, ct);
            sceneTree[sceneId] = hash;
        }

        var snapshot = new Snapshot
        {
            Id = Guid.NewGuid(),
            Label = label.Trim(),
            Message = message.Trim(),
            TimestampUtc = DateTimeOffset.UtcNow,
            Branch = branch,
            ParentId = parentId,
            Scenes = sceneTree,
        };

        await _snapshots.WriteSnapshotAsync(seriesRootPath, snapshot, ct);
        await _refs.WriteBranchTipAsync(seriesRootPath, branch, snapshot.Id, ct);

        _logger.LogInformation("Took snapshot '{Label}' ({Id}) on branch '{Branch}'",
            snapshot.Label, snapshot.Id, snapshot.Branch);

        return snapshot;
    }

    public Task<Snapshot?> GetSnapshotAsync(
        string seriesRootPath, Guid snapshotId, CancellationToken ct = default) =>
        _snapshots.ReadSnapshotAsync(seriesRootPath, snapshotId, ct);

    public async Task<IReadOnlyList<Snapshot>> GetHistoryAsync(
        string seriesRootPath,
        string? branchName = null,
        int limit = 50,
        CancellationToken ct = default)
    {
        var branch = branchName ?? await _refs.ReadHeadAsync(seriesRootPath, ct);
        var tipId = await _refs.ReadBranchTipAsync(seriesRootPath, branch, ct);
        if (tipId is null)
            return [];

        var history = new List<Snapshot>(Math.Min(limit, 64));
        var currentId = tipId;

        while (currentId is not null && history.Count < limit)
        {
            var snapshot = await _snapshots.ReadSnapshotAsync(seriesRootPath, currentId.Value, ct);
            if (snapshot is null)
                break;

            history.Add(snapshot);
            currentId = snapshot.ParentId;
        }

        return history;
    }

    public async Task<SnapshotDiff> GetSnapshotDiffAsync(
        string seriesRootPath, Guid snapshotId, CancellationToken ct = default)
    {
        var snapshot = await _snapshots.ReadSnapshotAsync(seriesRootPath, snapshotId, ct)
            ?? throw new SnapshotNotFoundException($"Snapshot {snapshotId} not found.");

        if (snapshot.ParentId is null)
        {
            return new SnapshotDiff
            {
                Added = snapshot.Scenes.Keys.ToList(),
                Modified = [],
                Removed = [],
                Unchanged = [],
            };
        }

        var parent = await _snapshots.ReadSnapshotAsync(seriesRootPath, snapshot.ParentId.Value, ct)
            ?? throw new SnapshotNotFoundException($"Parent snapshot {snapshot.ParentId} not found.");

        var added = new List<Guid>();
        var modified = new List<Guid>();
        var unchanged = new List<Guid>();

        foreach (var (id, hash) in snapshot.Scenes)
        {
            if (!parent.Scenes.TryGetValue(id, out var parentHash))
                added.Add(id);
            else if (parentHash != hash)
                modified.Add(id);
            else
                unchanged.Add(id);
        }

        var removed = parent.Scenes.Keys.Except(snapshot.Scenes.Keys).ToList();

        return new SnapshotDiff
        {
            Added = added,
            Modified = modified,
            Removed = removed,
            Unchanged = unchanged,
        };
    }

    public async Task<string?> GetSceneContentAtSnapshotAsync(
        string seriesRootPath, Guid sceneId, Guid snapshotId, CancellationToken ct = default)
    {
        var snapshot = await _snapshots.ReadSnapshotAsync(seriesRootPath, snapshotId, ct);
        if (snapshot is null || !snapshot.Scenes.TryGetValue(sceneId, out var hash))
            return null;

        return await _objects.ReadBlobAsync(seriesRootPath, hash, ct);
    }

    public async Task RestoreSceneAsync(
        string seriesRootPath, Guid sceneId, Guid snapshotId,
        string absoluteSceneFilePath, CancellationToken ct = default)
    {
        var content = await GetSceneContentAtSnapshotAsync(seriesRootPath, sceneId, snapshotId, ct)
            ?? throw new SnapshotNotFoundException(
                $"Scene {sceneId} not found in snapshot {snapshotId}.");

        var dir = Path.GetDirectoryName(absoluteSceneFilePath);
        if (dir is not null)
            Directory.CreateDirectory(dir);

        await SafeFileWriter.WriteAsync(absoluteSceneFilePath, content, ct);
        _logger.LogInformation("Restored scene {SceneId} from snapshot {SnapshotId}", sceneId, snapshotId);
    }

    public async Task RestoreSnapshotAsync(
        string seriesRootPath, Guid snapshotId,
        IReadOnlyDictionary<Guid, string> sceneFilePaths,
        CancellationToken ct = default)
    {
        var snapshot = await _snapshots.ReadSnapshotAsync(seriesRootPath, snapshotId, ct)
            ?? throw new SnapshotNotFoundException($"Snapshot {snapshotId} not found.");

        foreach (var (sceneId, filePath) in sceneFilePaths)
        {
            if (!snapshot.Scenes.TryGetValue(sceneId, out var hash))
            {
                _logger.LogWarning("Scene {SceneId} not in snapshot {SnapshotId}; skipping restore", sceneId, snapshotId);
                continue;
            }

            var content = await _objects.ReadBlobAsync(seriesRootPath, hash, ct);
            if (content is null)
            {
                _logger.LogWarning("Blob {Hash} missing for scene {SceneId}; skipping restore", hash, sceneId);
                continue;
            }

            var dir = Path.GetDirectoryName(filePath);
            if (dir is not null)
                Directory.CreateDirectory(dir);

            await SafeFileWriter.WriteAsync(filePath, content, ct);
            _logger.LogDebug("Restored scene {SceneId} to {FilePath}", sceneId, filePath);
        }

        _logger.LogInformation("Restored {Count} scenes from snapshot {SnapshotId}",
            sceneFilePaths.Count, snapshotId);
    }

    public async Task<IReadOnlyList<Branch>> GetBranchesAsync(
        string seriesRootPath, CancellationToken ct = default)
    {
        var currentBranch = await _refs.ReadHeadAsync(seriesRootPath, ct);
        var names = await _refs.ListBranchesAsync(seriesRootPath, ct);
        var branches = new List<Branch>(names.Count);

        foreach (var name in names)
        {
            var tipId = await _refs.ReadBranchTipAsync(seriesRootPath, name, ct);
            branches.Add(new Branch
            {
                Name = name,
                TipSnapshotId = tipId,
                IsCurrent = name == currentBranch,
            });
        }

        return branches;
    }

    public async Task<Branch> CreateBranchAsync(
        string seriesRootPath, string name,
        Guid? fromSnapshotId = null, CancellationToken ct = default)
    {
        BranchNameValidator.Validate(name);

        var existing = await _refs.ReadBranchTipAsync(seriesRootPath, name, ct);
        if (existing is not null || File.Exists(
            Path.Combine(seriesRootPath, ".textforge", "refs", "branches", name)))
        {
            throw new InvalidOperationException($"Branch '{name}' already exists.");
        }

        Guid? tipId = fromSnapshotId;
        if (tipId is null)
        {
            var currentBranch = await _refs.ReadHeadAsync(seriesRootPath, ct);
            tipId = await _refs.ReadBranchTipAsync(seriesRootPath, currentBranch, ct);
        }

        if (tipId is not null)
            await _refs.WriteBranchTipAsync(seriesRootPath, name, tipId.Value, ct);
        else
        {
            // Empty branch — create an empty file
            var path = Path.Combine(seriesRootPath, ".textforge", "refs", "branches", name);
            await File.WriteAllTextAsync(path, string.Empty, ct);
        }

        _logger.LogInformation("Created branch '{Name}' from snapshot {TipId}", name, tipId);

        return new Branch { Name = name, TipSnapshotId = tipId };
    }

    public async Task SwitchBranchAsync(
        string seriesRootPath, string branchName, CancellationToken ct = default)
    {
        var branchPath = Path.Combine(seriesRootPath, ".textforge", "refs", "branches", branchName);
        if (!File.Exists(branchPath))
            throw new InvalidOperationException($"Branch '{branchName}' does not exist.");

        await _refs.WriteHeadAsync(seriesRootPath, branchName, ct);
        _logger.LogInformation("Switched to branch '{Branch}'", branchName);
    }

    public Task<string> GetCurrentBranchAsync(
        string seriesRootPath, CancellationToken ct = default) =>
        _refs.ReadHeadAsync(seriesRootPath, ct);

    public async Task<Snapshot?> GetLatestSnapshotAsync(
        string seriesRootPath, CancellationToken ct = default)
    {
        var branch = await _refs.ReadHeadAsync(seriesRootPath, ct);
        var tipId = await _refs.ReadBranchTipAsync(seriesRootPath, branch, ct);
        if (tipId is null)
            return null;

        return await _snapshots.ReadSnapshotAsync(seriesRootPath, tipId.Value, ct);
    }
}
