namespace TextForge.Core.Manifests;

public sealed class BookManifest
{
    /// <summary>Increment when the on-disk format changes incompatibly.</summary>
    public const int CurrentVersion = 1;

    public int Version { get; set; } = CurrentVersion;
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTimeOffset CreatedUtc { get; set; }
    public DateTimeOffset ModifiedUtc { get; set; }
    public List<ChapterManifest> Chapters { get; set; } = new();
}
