namespace TextForge.Api.Dtos;

public sealed record CharacterDto(
    Guid Id,
    string Name,
    string Role,
    int? Age,
    string? Gender,
    string? Personality,
    string? Biography,
    bool HasImage);
