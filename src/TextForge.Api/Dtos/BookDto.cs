namespace TextForge.Api.Dtos;

public sealed record BookDto(
    Guid Id,
    string Title,
    string RootPath,
    DateTimeOffset CreatedUtc,
    DateTimeOffset ModifiedUtc,
    IReadOnlyList<ChapterDto> Chapters);
