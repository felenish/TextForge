using TextForge.Core.Models;

namespace TextForge.Api.Dtos;

internal static class DtoMapper
{
    public static PlotGridMetaDto ToPlotGridMeta(PlotGrid g) => new(g.Id, g.Name);
    public static PlotGridDto ToPlotGridDto(PlotGrid g) => new(
        g.Id,
        g.Name,
        g.Columns.Select(c => new PlotGridColumnDto(c.Id, c.Label)).ToArray(),
        g.Rows.Select(r => new PlotGridRowDto(r.Id, r.Label)).ToArray(),
        g.Cells.Select(c => new PlotGridCellDto(c.RowId, c.ColId, c.Content)).ToArray());

    public static OutlineDto ToOutlineMeta(Outline o) => new(o.Id, o.Name, null);
    public static OutlineDto ToOutlineDto(Outline o) => new(o.Id, o.Name, o.Content);

    public static LocationDto ToLocationDto(Location l) => new(
        l.Id, l.Name, l.Description, l.ImageFileName is not null,
        l.CustomSections.Select(s => new LocationSectionDto(s.Id, s.Title, s.Content)).ToArray(),
        l.SortOrder, l.FolderId);

    public static CharacterDto ToCharacterDto(Character c) => new(
        c.Id, c.Name, c.Role, c.Age, c.Gender, c.Personality, c.Biography,
        c.ImageFileName is not null,
        c.CustomSections.Select(s => new CharacterSectionDto(s.Id, s.Title, s.Content)).ToArray(),
        c.SortOrder, c.FolderId);
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
        scene.Status,
        scene.Pov,
        scene.CharacterIds.Select(id => id.ToString()).ToArray(),
        scene.Notes,
        scene.ChecklistItems
            .Select(i => new ChecklistItemDto(i.Id.ToString(), i.Text, i.Done))
            .ToArray());

    public static SceneDto ToSceneMeta(Scene scene) => new(
        scene.Id,
        scene.Title,
        scene.FilePath,
        scene.SortOrder,
        null,
        scene.Status,
        null,
        [],
        null,
        []);
}
