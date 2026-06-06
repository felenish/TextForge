namespace TextForge.Core.Models;

public sealed class WorldFolder
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
