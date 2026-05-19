namespace TextForge.Core.Models;

public sealed class Series
{
    public Guid Id { get; init; }
    public string Title { get; set; } = string.Empty;
    public string RootPath { get; set; } = string.Empty;
    public List<BookProject> Books { get; } = new();
    public DateTimeOffset CreatedUtc { get; init; }
    public DateTimeOffset ModifiedUtc { get; set; }
}
