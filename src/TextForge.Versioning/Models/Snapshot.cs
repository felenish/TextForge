namespace TextForge.Versioning.Models;

public sealed class Snapshot
{
    public Guid Id { get; init; }
    public string Label { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset TimestampUtc { get; init; }
    public string Branch { get; init; } = "main";
    public Guid? ParentId { get; init; }
    public IReadOnlyDictionary<Guid, string> Scenes { get; init; } = new Dictionary<Guid, string>();
}
