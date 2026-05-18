namespace TextForge.Core.Manifests;

public sealed class ChapterManifest
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Folder { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<SceneManifest> Scenes { get; set; } = new();
}
