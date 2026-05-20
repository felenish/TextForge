namespace TextForge.Versioning.Models;

public sealed class SnapshotDiff
{
    public IReadOnlyList<Guid> Added { get; init; } = [];
    public IReadOnlyList<Guid> Modified { get; init; } = [];
    public IReadOnlyList<Guid> Removed { get; init; } = [];
    public IReadOnlyList<Guid> Unchanged { get; init; } = [];
}
