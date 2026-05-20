namespace TextForge.Versioning.Models;

public sealed class Branch
{
    public string Name { get; init; } = string.Empty;
    public Guid? TipSnapshotId { get; set; }
    public bool IsCurrent { get; set; }
}
