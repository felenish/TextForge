namespace TextForge.Core.Models;

public sealed class Location
{
    public Guid Id { get; init; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageFileName { get; set; }
}
