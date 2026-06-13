namespace TextForge.Core.Manifests;

public sealed class BookManifest
{
    /// <summary>Increment when the on-disk format changes incompatibly.</summary>
    public const int CurrentVersion = 2;

    public int Version { get; set; } = CurrentVersion;
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTimeOffset CreatedUtc { get; set; }
    public DateTimeOffset ModifiedUtc { get; set; }
    public List<ChapterManifest> Chapters { get; set; } = new();
    public BookModulesManifest Modules { get; set; } = new();
}

public sealed class BookModulesManifest
{
    /// <summary>IDs of modules enabled for this project.</summary>
    public List<string> Enabled { get; set; } = [];

    /// <summary>Last-seen version of each module, keyed by module ID.</summary>
    public Dictionary<string, string> Versions { get; set; } = [];
}
