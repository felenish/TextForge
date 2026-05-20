namespace TextForge.Core.Models;

public sealed class Scene
{
    public Guid Id { get; init; }
    public string Title { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string Status { get; set; } = "draft";
    public string Content { get; set; } = string.Empty;
    public string? Pov { get; set; }
    public List<Guid> CharacterIds { get; set; } = [];
    public string? Notes { get; set; }
}
