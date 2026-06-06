namespace TextForge.Api.Dtos;

public sealed record LocationDto(Guid Id, string Name, string? Description, bool HasImage, IReadOnlyList<LocationSectionDto> CustomSections);

public sealed record LocationSectionDto(Guid Id, string Title, string Content);
