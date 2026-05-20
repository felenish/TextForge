namespace TextForge.Api.Dtos;

public sealed record VersionStatusDto(
    string Branch,
    SnapshotSummaryDto? LatestSnapshot);

public sealed record SnapshotSummaryDto(
    Guid Id,
    string Label,
    DateTimeOffset TimestampUtc,
    string Branch,
    int SceneCount);

public sealed record SnapshotListDto(
    IReadOnlyList<SnapshotSummaryDto> Snapshots,
    bool HasMore);

public sealed record SnapshotDetailDto(
    Guid Id,
    string Label,
    string Message,
    DateTimeOffset TimestampUtc,
    string Branch,
    Guid? ParentId,
    IReadOnlyList<SceneChangeDto> Changes);

public sealed record SceneChangeDto(
    Guid SceneId,
    string SceneTitle,
    string ChangeKind);

public sealed record BranchDto(
    string Name,
    bool IsCurrent,
    SnapshotSummaryDto? Tip);

public sealed record SceneAtSnapshotDto(
    Guid SceneId,
    Guid SnapshotId,
    string? Content);
