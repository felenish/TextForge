namespace TextForge.Core.Manifests;

public sealed class SceneManifest
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string File { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
