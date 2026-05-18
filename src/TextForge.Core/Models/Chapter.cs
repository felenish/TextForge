namespace TextForge.Core.Models;

public sealed class Chapter
{
    public Guid Id { get; init; }
    public string Title { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<Scene> Scenes { get; } = new();
}
