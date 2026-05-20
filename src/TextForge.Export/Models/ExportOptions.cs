namespace TextForge.Export.Models;

public sealed record ExportOptions(
    string Title,
    string Author,
    ExportFormat Format,
    IReadOnlyList<Guid>? BookIds = null);

public enum ExportFormat { Pdf, Epub }
