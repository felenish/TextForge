using TextForge.Core.Validation;

namespace TextForge.Storage.Utilities;

public static class FolderPathBuilder
{
    public static string BuildBookFolder(string parentDirectory, string title)
    {
        var slug = PathSanitizer.Sanitize(title);
        return ResolveUniqueDirectory(parentDirectory, slug);
    }

    public static string BuildChapterFolder(string manuscriptPath, int sortOrder, string title)
    {
        var slug = PathSanitizer.Sanitize(title);
        var name = $"chapter-{sortOrder:D3}-{slug}";
        return ResolveUniqueDirectory(manuscriptPath, name);
    }

    public static string BuildSceneFileName(int sortOrder, string title)
    {
        var slug = PathSanitizer.Sanitize(title);
        return $"scene-{sortOrder:D3}-{slug}.md";
    }

    private static string ResolveUniqueDirectory(string parent, string name)
    {
        var candidate = Path.Combine(parent, name);
        if (!Directory.Exists(candidate))
            return candidate;

        for (var i = 2; i <= 999; i++)
        {
            candidate = Path.Combine(parent, $"{name}-{i}");
            if (!Directory.Exists(candidate))
                return candidate;
        }

        return Path.Combine(parent, $"{name}-{Guid.NewGuid():N}");
    }
}
