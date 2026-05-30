namespace TextForge.Core.Manifests;

public sealed class SceneManifest
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string File { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string Status { get; set; } = "draft";
    public string? Pov { get; set; }
    public List<Guid> CharacterIds { get; set; } = [];
    public string? Notes { get; set; }
    public List<SceneChecklistItemManifest> ChecklistItems { get; set; } = [];
}
