namespace TextForge.Core.Manifests;

public sealed class SceneChecklistItemManifest
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool Done { get; set; }
}
