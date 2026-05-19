namespace TextForge.Core.Models;

public sealed class Character
{
    public Guid Id { get; init; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
}
