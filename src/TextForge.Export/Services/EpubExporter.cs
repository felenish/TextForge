using System.IO.Compression;
using System.Text;
using TextForge.Core.Models;
using TextForge.Export.Models;

namespace TextForge.Export.Services;

internal static class EpubExporter
{
    internal static async Task ExportAsync(
        IReadOnlyList<BookProject> books,
        ExportOptions options,
        IReadOnlyDictionary<Guid, string> sceneContent,
        string outputPath,
        CancellationToken ct)
    {
        // Build chapter list: (itemId, filename, chapterTitle, htmlBody)
        var chapters = BuildChapterItems(books, sceneContent);
        var uid = Guid.NewGuid().ToString();
        var timestamp = DateTimeOffset.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");

        await using var fs = new FileStream(outputPath, FileMode.Create, FileAccess.Write);
        using var zip = new ZipArchive(fs, ZipArchiveMode.Create, leaveOpen: false, Encoding.UTF8);

        // mimetype MUST be first entry, stored (no compression)
        var mt = zip.CreateEntry("mimetype", CompressionLevel.NoCompression);
        await WriteAsync(mt, "application/epub+zip", ct);

        await WriteAsync(zip.CreateEntry("META-INF/container.xml"), ContainerXml(), ct);
        await WriteAsync(zip.CreateEntry("OEBPS/styles/style.css"), StyleCss(), ct);
        await WriteAsync(zip.CreateEntry("OEBPS/content.opf"), ContentOpf(uid, options, timestamp, chapters), ct);
        await WriteAsync(zip.CreateEntry("OEBPS/nav.xhtml"), NavXhtml(options, chapters), ct);

        foreach (var (itemId, filename, title, body) in chapters)
        {
            ct.ThrowIfCancellationRequested();
            await WriteAsync(zip.CreateEntry($"OEBPS/text/{filename}"), ChapterXhtml(title, body), ct);
        }
    }

    // ── Builders ──────────────────────────────────────────────────────────

    private static List<(string ItemId, string Filename, string Title, string Body)> BuildChapterItems(
        IReadOnlyList<BookProject> books,
        IReadOnlyDictionary<Guid, string> sceneContent)
    {
        var list = new List<(string, string, string, string)>();
        var seq = 1;

        foreach (var book in books)
        {
            foreach (var chapter in book.Chapters.OrderBy(c => c.SortOrder))
            {
                var sb = new StringBuilder();
                var scenes = chapter.Scenes.OrderBy(s => s.SortOrder).ToList();

                for (var i = 0; i < scenes.Count; i++)
                {
                    var scene = scenes[i];
                    var content = sceneContent.TryGetValue(scene.Id, out var c) ? c : string.Empty;

                    if (!string.IsNullOrWhiteSpace(content))
                    {
                        foreach (var para in content.Split(["\r\n\r\n", "\n\n"], StringSplitOptions.RemoveEmptyEntries))
                        {
                            var trimmed = para.Trim();
                            if (string.IsNullOrEmpty(trimmed)) continue;
                            if (trimmed.StartsWith("[[img:") && trimmed.EndsWith("]]")) continue;
                            sb.Append("<p>").Append(EscapeXml(trimmed.Replace("\n", " "))).AppendLine("</p>");
                        }
                    }

                    if (i < scenes.Count - 1)
                        sb.AppendLine("<p class=\"scene-break\">* * *</p>");
                }

                var id = $"ch{seq:D3}";
                var file = $"chapter-{seq:D3}.xhtml";
                list.Add((id, file, chapter.Title, sb.ToString()));
                seq++;
            }
        }

        return list;
    }

    private static string ContainerXml() => """
        <?xml version="1.0" encoding="UTF-8"?>
        <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
          <rootfiles>
            <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
          </rootfiles>
        </container>
        """;

    private static string ContentOpf(
        string uid,
        ExportOptions options,
        string timestamp,
        List<(string ItemId, string Filename, string Title, string Body)> chapters)
    {
        var manifest = new StringBuilder();
        manifest.AppendLine("""    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>""");
        manifest.AppendLine("""    <item id="css" href="styles/style.css" media-type="text/css"/>""");
        foreach (var (id, file, _, _) in chapters)
            manifest.AppendLine($"""    <item id="{id}" href="text/{file}" media-type="application/xhtml+xml"/>""");

        var spine = new StringBuilder();
        foreach (var (id, _, _, _) in chapters)
            spine.AppendLine($"""    <itemref idref="{id}"/>""");

        return $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <package version="3.0" unique-identifier="uid" xmlns="http://www.idpf.org/2007/opf" xml:lang="en">
              <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
                <dc:identifier id="uid">urn:uuid:{uid}</dc:identifier>
                <dc:title>{EscapeXml(options.Title)}</dc:title>
                <dc:creator>{EscapeXml(options.Author)}</dc:creator>
                <dc:language>en</dc:language>
                <meta property="dcterms:modified">{timestamp}</meta>
              </metadata>
              <manifest>
            {manifest.ToString().TrimEnd()}
              </manifest>
              <spine>
            {spine.ToString().TrimEnd()}
              </spine>
            </package>
            """;
    }

    private static string NavXhtml(
        ExportOptions options,
        List<(string ItemId, string Filename, string Title, string Body)> chapters)
    {
        var items = new StringBuilder();
        foreach (var (_, file, title, _) in chapters)
            items.AppendLine($"""      <li><a href="text/{file}">{EscapeXml(title)}</a></li>""");

        return $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <!DOCTYPE html>
            <html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
            <head><meta charset="UTF-8"/><title>{EscapeXml(options.Title)}</title></head>
            <body>
              <nav epub:type="toc" id="toc">
                <h1>Contents</h1>
                <ol>
            {items.ToString().TrimEnd()}
                </ol>
              </nav>
            </body>
            </html>
            """;
    }

    private static string ChapterXhtml(string title, string body) => $"""
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE html>
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta charset="UTF-8"/>
          <title>{EscapeXml(title)}</title>
          <link rel="stylesheet" type="text/css" href="../styles/style.css"/>
        </head>
        <body>
          <h1>{EscapeXml(title)}</h1>
          {body}
        </body>
        </html>
        """;

    private static string StyleCss() => """
        body { font-family: Georgia, serif; font-size: 1em; line-height: 1.6; margin: 5%; }
        h1 { font-size: 1.4em; margin-bottom: 1.5em; font-weight: bold; }
        p { margin: 0 0 0.7em 0; text-indent: 1.5em; }
        p:first-of-type { text-indent: 0; }
        p.scene-break { text-align: center; text-indent: 0; margin: 1.5em 0; letter-spacing: 0.3em; }
        """;

    // ── Helpers ───────────────────────────────────────────────────────────

    private static async Task WriteAsync(ZipArchiveEntry entry, string content, CancellationToken ct)
    {
        await using var stream = entry.Open();
        await using var writer = new StreamWriter(stream, Encoding.UTF8);
        await writer.WriteAsync(content.AsMemory(), ct);
    }

    private static string EscapeXml(string s) =>
        s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");
}
