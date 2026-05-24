using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using TextForge.Core.Models;
using TextForge.Export.Models;

namespace TextForge.Export.Services;

internal static class PdfExporter
{
    internal static void Export(
        IReadOnlyList<BookProject> books,
        ExportOptions options,
        IReadOnlyDictionary<Guid, string> sceneContent,
        string outputPath)
    {
        QuestPDF.Settings.License = LicenseType.Community;

        Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2.5f, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(11).LineHeight(1.6f));

                page.Footer()
                    .AlignCenter()
                    .Text(t => t.CurrentPageNumber());

                page.Content().Column(col =>
                {
                    col.Spacing(0);

                    // Title page
                    col.Item()
                        .Height(20, Unit.Centimetre)
                        .AlignMiddle()
                        .Column(tc =>
                        {
                            tc.Item()
                                .AlignCenter()
                                .DefaultTextStyle(x => x.Bold().FontSize(28))
                                .Text(options.Title);

                            if (!string.IsNullOrWhiteSpace(options.Author))
                                tc.Item()
                                    .PaddingTop(14)
                                    .AlignCenter()
                                    .DefaultTextStyle(x => x.FontSize(15))
                                    .Text(options.Author);
                        });

                    foreach (var book in books)
                    {
                        if (books.Count > 1)
                        {
                            col.Item().PageBreak();
                            col.Item()
                                .PaddingBottom(32)
                                .AlignCenter()
                                .DefaultTextStyle(x => x.Bold().FontSize(20))
                                .Text(book.Title);
                        }

                        foreach (var chapter in book.Chapters.OrderBy(c => c.SortOrder))
                        {
                            col.Item().PageBreak();
                            col.Item()
                                .PaddingBottom(24)
                                .DefaultTextStyle(x => x.Bold().FontSize(16))
                                .Text(chapter.Title);

                            var scenes = chapter.Scenes.OrderBy(s => s.SortOrder).ToList();

                            for (var i = 0; i < scenes.Count; i++)
                            {
                                var scene = scenes[i];
                                var content = sceneContent.TryGetValue(scene.Id, out var c) ? c : string.Empty;

                                if (!string.IsNullOrWhiteSpace(content))
                                {
                                    var paragraphs = content.Split(
                                        ["\r\n\r\n", "\n\n"],
                                        StringSplitOptions.RemoveEmptyEntries);

                                    foreach (var para in paragraphs)
                                    {
                                        var trimmed = para.Trim();
                                        if (string.IsNullOrEmpty(trimmed)) continue;
                                        if (trimmed.StartsWith("[[img:") && trimmed.EndsWith("]]")) continue;
                                        col.Item().PaddingBottom(6).Text(trimmed);
                                    }
                                }

                                if (i < scenes.Count - 1)
                                    col.Item()
                                        .PaddingVertical(14)
                                        .AlignCenter()
                                        .Text("* * *");
                            }
                        }
                    }
                });
            });
        })
        .GeneratePdf(outputPath);
    }
}
