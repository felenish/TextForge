namespace TextForge.Api.Dtos;

public sealed record SeriesDto(
    Guid Id,
    string Title,
    string RootPath,
    DateTimeOffset CreatedUtc,
    DateTimeOffset ModifiedUtc,
    BookDto[] Books);
