namespace TextForge.Api.Dtos;

public sealed record ChecklistItemDto(
    string Id,
    string Text,
    bool Done);
