namespace TextForge.Api.Dtos;

public sealed record ChapterDto(
    Guid Id,
    string Title,
    int SortOrder,
    IReadOnlyList<SceneDto> Scenes);
