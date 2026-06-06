namespace TextForge.Api.Dtos;

public sealed record CharacterDto(
    Guid Id,
    string Name,
    string Role,
    int? Age,
    string? Gender,
    string? Personality,
    string? Biography,
    bool HasImage,
    IReadOnlyList<CharacterSectionDto> CustomSections,
    int SortOrder = 0,
    string? FolderId = null);

public sealed record CharacterSectionDto(Guid Id, string Title, string Content);
