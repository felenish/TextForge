using TextForge.Modules;

namespace TextForge.Storage.Services;

/// <summary>
/// Handles file I/O for a module's isolated storage directory within a project.
/// All paths are validated to remain within the module's storage root.
/// </summary>
public sealed class ModuleStorageService
{
    private readonly ModuleRegistry _registry;

    public ModuleStorageService(ModuleRegistry registry)
    {
        _registry = registry;
    }

    public string GetAndEnsureStoragePath(string projectRoot, string moduleId)
    {
        var path = _registry.GetStoragePath(projectRoot, moduleId);
        Directory.CreateDirectory(path);
        return path;
    }

    public async Task<byte[]> ReadFileAsync(string projectRoot, string moduleId, string relativePath, CancellationToken ct)
    {
        var fullPath = ResolveSafePath(projectRoot, moduleId, relativePath);
        if (!File.Exists(fullPath))
            throw new FileNotFoundException($"Module storage file not found: {relativePath}");

        return await File.ReadAllBytesAsync(fullPath, ct);
    }

    public async Task WriteFileAsync(string projectRoot, string moduleId, string relativePath, Stream content, CancellationToken ct)
    {
        var fullPath = ResolveSafePath(projectRoot, moduleId, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var fs = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None);
        await content.CopyToAsync(fs, ct);
    }

    public void DeleteFile(string projectRoot, string moduleId, string relativePath)
    {
        var fullPath = ResolveSafePath(projectRoot, moduleId, relativePath);
        if (File.Exists(fullPath))
            File.Delete(fullPath);
    }

    public IReadOnlyList<string> ListDirectory(string projectRoot, string moduleId, string relativeDir)
    {
        var fullPath = ResolveSafePath(projectRoot, moduleId, relativeDir);
        if (!Directory.Exists(fullPath))
            return [];

        return Directory.GetFileSystemEntries(fullPath)
            .Select(e => Path.GetRelativePath(GetAndEnsureStoragePath(projectRoot, moduleId), e)
                .Replace('\\', '/'))
            .ToList();
    }

    /// <summary>
    /// Resolves a module-relative path to an absolute path, throwing if the result
    /// escapes the module's storage directory.
    /// </summary>
    private string ResolveSafePath(string projectRoot, string moduleId, string relativePath)
    {
        var storageRoot = _registry.GetStoragePath(projectRoot, moduleId);
        var fullPath = Path.GetFullPath(Path.Combine(storageRoot, relativePath));

        if (!fullPath.StartsWith(Path.GetFullPath(storageRoot), StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException(
                $"Path '{relativePath}' escapes module storage boundary.");

        return fullPath;
    }
}
