namespace TextForge.Core.Models;

public sealed class Character
{
    public Guid Id { get; init; }
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public string? Personality { get; set; }
    public string? Biography { get; set; }
    public string? ImageFileName { get; set; }
    public List<CharacterSection> CustomSections { get; set; } = [];
}

public sealed class CharacterSection
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}
