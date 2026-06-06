namespace TextForge.Core.Models;

public sealed class Outline
{
    public Guid Id { get; init; }
    public string Name { get; set; } = string.Empty;
    public string? Content { get; set; }
    public int SortOrder { get; set; }
}
