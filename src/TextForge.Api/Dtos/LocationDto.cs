namespace TextForge.Api.Dtos;

public sealed record LocationDto(Guid Id, string Name, string? Description, bool HasImage, IReadOnlyList<LocationSectionDto> CustomSections, int SortOrder = 0, string? FolderId = null);

public sealed record LocationSectionDto(Guid Id, string Title, string Content);
