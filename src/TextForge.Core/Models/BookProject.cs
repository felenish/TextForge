namespace TextForge.Core.Models;

public sealed class BookProject
{
    public Guid Id { get; init; }
    public string Title { get; set; } = string.Empty;
    public string RootPath { get; set; } = string.Empty;
    public List<Chapter> Chapters { get; } = new();
    public DateTimeOffset CreatedUtc { get; init; }
    public DateTimeOffset ModifiedUtc { get; set; }
}
