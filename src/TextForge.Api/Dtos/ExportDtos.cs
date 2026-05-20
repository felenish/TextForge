namespace TextForge.Api.Dtos;

public sealed record ExportRequest(
    string Format,
    string Title,
    string Author,
    IReadOnlyList<string>? BookIds = null);

public sealed record ExportResultDto(string? OutputPath, bool Cancelled);
