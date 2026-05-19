namespace TextForge.Api.Dtos;

public sealed record LocationDto(Guid Id, string Name, string? Description, bool HasImage);
