namespace TextForge.Core.Models;

public sealed class BookProject
{
    public Guid Id { get; init; }
    public string Title { get; set; } = string.Empty;
    public string RootPath { get; set; } = string.Empty;
    public List<Chapter> Chapters { get; } = new();
    public DateTimeOffset CreatedUtc { get; init; }
    public DateTimeOffset ModifiedUtc { get; set; }

    /// <summary>IDs of modules enabled for this project.</summary>
    public List<string> EnabledModules { get; set; } = [];

    /// <summary>Last-seen version of each module, keyed by module ID.</summary>
    public Dictionary<string, string> ModuleVersions { get; set; } = [];
}
