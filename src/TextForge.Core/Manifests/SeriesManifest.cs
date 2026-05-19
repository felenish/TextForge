namespace TextForge.Core.Manifests;

public sealed class SeriesManifest
{
    /// <summary>Increment when the on-disk format changes incompatibly.</summary>
    public const int CurrentVersion = 1;

    public int Version { get; set; } = CurrentVersion;
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTimeOffset CreatedUtc { get; set; }
    public DateTimeOffset ModifiedUtc { get; set; }
    public List<BookEntry> Books { get; set; } = new();
}

public sealed class BookEntry
{
    /// <summary>Stable GUID matching the book's own manifest Id.</summary>
    public Guid Id { get; set; }

    /// <summary>Name of the book's subfolder relative to the series root.</summary>
    public string Folder { get; set; } = string.Empty;

    public int SortOrder { get; set; }
}
