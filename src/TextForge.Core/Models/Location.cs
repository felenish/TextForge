namespace TextForge.Core.Models;

public sealed class Location
{
    public Guid Id { get; init; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageFileName { get; set; }
    public List<LocationSection> CustomSections { get; set; } = [];
    public int SortOrder { get; set; }
    public string? FolderId { get; set; }
}

public sealed class LocationSection
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}
