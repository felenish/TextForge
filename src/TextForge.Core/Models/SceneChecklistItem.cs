namespace TextForge.Core.Models;

public sealed class SceneChecklistItem
{
    public Guid Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool Done { get; set; }
}
