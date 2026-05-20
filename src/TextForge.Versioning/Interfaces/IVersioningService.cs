using TextForge.Versioning.Models;

namespace TextForge.Versioning.Interfaces;

public interface IVersioningService
{
    Task EnsureInitialisedAsync(string seriesRootPath, CancellationToken ct = default);

    Task<Snapshot> TakeSnapshotAsync(
        string seriesRootPath,
        string label,
        IReadOnlyDictionary<Guid, string> sceneContents,
        string message = "",
        CancellationToken ct = default);

    Task<Snapshot?> GetSnapshotAsync(
        string seriesRootPath, Guid snapshotId, CancellationToken ct = default);

    Task<IReadOnlyList<Snapshot>> GetHistoryAsync(
        string seriesRootPath,
        string? branchName = null,
        int limit = 50,
        CancellationToken ct = default);

    Task<SnapshotDiff> GetSnapshotDiffAsync(
        string seriesRootPath, Guid snapshotId, CancellationToken ct = default);

    Task<string?> GetSceneContentAtSnapshotAsync(
        string seriesRootPath, Guid sceneId, Guid snapshotId, CancellationToken ct = default);

    Task RestoreSceneAsync(
        string seriesRootPath, Guid sceneId, Guid snapshotId,
        string absoluteSceneFilePath, CancellationToken ct = default);

    Task<RestoreResult> RestoreSnapshotAsync(
        string seriesRootPath, Guid snapshotId,
        IReadOnlyDictionary<Guid, string> sceneFilePaths,
        CancellationToken ct = default);

    Task<IReadOnlyList<Branch>> GetBranchesAsync(
        string seriesRootPath, CancellationToken ct = default);

    Task<Branch> CreateBranchAsync(
        string seriesRootPath, string name,
        Guid? fromSnapshotId = null, CancellationToken ct = default);

    Task SwitchBranchAsync(
        string seriesRootPath, string branchName, CancellationToken ct = default);

    Task<string> GetCurrentBranchAsync(
        string seriesRootPath, CancellationToken ct = default);

    Task<Snapshot?> GetLatestSnapshotAsync(
        string seriesRootPath, CancellationToken ct = default);
}
