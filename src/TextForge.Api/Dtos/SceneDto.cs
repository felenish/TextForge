namespace TextForge.Api.Dtos;

public sealed record SceneDto(
    Guid Id,
    string Title,
    string FilePath,
    int SortOrder,
    string? Content);
