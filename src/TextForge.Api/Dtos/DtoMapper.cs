using TextForge.Core.Models;

namespace TextForge.Api.Dtos;

internal static class DtoMapper
{
    public static LocationDto ToLocationDto(Location l) => new(l.Id, l.Name, l.Description, l.ImageFileName is not null);

    public static CharacterDto ToCharacterDto(Character c) => new(
        c.Id, c.Name, c.Role, c.Age, c.Gender, c.Personality, c.Biography,
        c.ImageFileName is not null);
    public static SeriesDto ToSeriesDto(Series series) => new(
        series.Id,
        series.Title,
        series.RootPath,
        series.CreatedUtc,
        series.ModifiedUtc,
        series.Books.Select(ToBookDto).ToArray());

    public static BookDto ToBookDto(BookProject book) => new(
        book.Id,
        book.Title,
        book.RootPath,
        book.CreatedUtc,
        book.ModifiedUtc,
        book.Chapters.Select(ToChapterDto).ToArray());

    public static ChapterDto ToChapterDto(Chapter chapter) => new(
        chapter.Id,
        chapter.Title,
        chapter.SortOrder,
        chapter.Scenes.Select(ToSceneMeta).ToArray());

    public static SceneDto ToSceneDto(Scene scene) => new(
        scene.Id,
        scene.Title,
        scene.FilePath,
        scene.SortOrder,
        string.IsNullOrEmpty(scene.Content) ? null : scene.Content,
        scene.Status);

    public static SceneDto ToSceneMeta(Scene scene) => new(
        scene.Id,
        scene.Title,
        scene.FilePath,
        scene.SortOrder,
        null,
        scene.Status);
}
