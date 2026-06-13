using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace TextForge.Modules;

public sealed class ModuleRegistry
{
    private const string ManifestFileName = "module.json";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private static readonly char[] PathSeparators = ['/', '\\'];

    private readonly List<ModuleRegistration> _modules = [];
    private readonly ILogger<ModuleRegistry> _logger;

    public ModuleRegistry(ILogger<ModuleRegistry> logger)
    {
        _logger = logger;
    }

    public IReadOnlyList<ModuleRegistration> Modules => _modules.AsReadOnly();

    /// <summary>
    /// Scans <paramref name="scanPath"/> for subdirectories containing a valid module.json
    /// and registers any that pass validation.
    /// </summary>
    public void Discover(string scanPath)
    {
        if (!Directory.Exists(scanPath))
        {
            _logger.LogDebug("Module scan path does not exist, skipping: {Path}", scanPath);
            return;
        }

        foreach (var dir in Directory.EnumerateDirectories(scanPath))
        {
            var manifestPath = Path.Combine(dir, ManifestFileName);
            if (!File.Exists(manifestPath))
                continue;

            try
            {
                var json = File.ReadAllText(manifestPath);
                var manifest = JsonSerializer.Deserialize<ModuleManifest>(json, JsonOptions);
                if (manifest is null)
                {
                    _logger.LogWarning("Module manifest deserialized to null: {Path}", manifestPath);
                    continue;
                }

                if (!ValidateManifest(manifest, manifestPath))
                    continue;

                _modules.Add(new ModuleRegistration
                {
                    Manifest = manifest,
                    ModuleDirectory = dir,
                });

                _logger.LogInformation("Registered module '{Id}' v{Version} from {Dir}",
                    manifest.Id, manifest.Version, dir);
            }
            catch (Exception ex) when (ex is IOException or JsonException or UnauthorizedAccessException)
            {
                _logger.LogWarning(ex, "Failed to load module manifest: {Path}", manifestPath);
            }
        }
    }

    public ModuleRegistration? Get(string moduleId) =>
        _modules.FirstOrDefault(m => m.Manifest.Id == moduleId);

    /// <summary>
    /// Returns the absolute path to a module's storage directory within the project root.
    /// Does not create the directory.
    /// </summary>
    public string GetStoragePath(string projectRoot, string moduleId)
    {
        var registration = Get(moduleId)
            ?? throw new InvalidOperationException($"Module '{moduleId}' is not registered.");

        return Path.Combine(projectRoot, "modules", registration.Manifest.StorageFolder);
    }

    private bool ValidateManifest(ModuleManifest manifest, string manifestPath)
    {
        if (string.IsNullOrWhiteSpace(manifest.Id))
        {
            _logger.LogWarning("Module manifest missing 'id': {Path}", manifestPath);
            return false;
        }

        if (manifest.Id.IndexOfAny(PathSeparators) >= 0 || manifest.Id.Contains(".."))
        {
            _logger.LogWarning("Module id '{Id}' contains path traversal characters, skipping: {Path}",
                manifest.Id, manifestPath);
            return false;
        }

        if (string.IsNullOrWhiteSpace(manifest.Name))
        {
            _logger.LogWarning("Module '{Id}' manifest missing 'name': {Path}", manifest.Id, manifestPath);
            return false;
        }

        if (string.IsNullOrWhiteSpace(manifest.Version))
        {
            _logger.LogWarning("Module '{Id}' manifest missing 'version': {Path}", manifest.Id, manifestPath);
            return false;
        }

        if (string.IsNullOrWhiteSpace(manifest.StorageFolder))
        {
            _logger.LogWarning("Module '{Id}' manifest missing 'storageFolder': {Path}", manifest.Id, manifestPath);
            return false;
        }

        if (manifest.StorageFolder.IndexOfAny(PathSeparators) >= 0 || manifest.StorageFolder.Contains(".."))
        {
            _logger.LogWarning("Module '{Id}' storageFolder contains path traversal characters, skipping: {Path}",
                manifest.Id, manifestPath);
            return false;
        }

        if (_modules.Any(m => m.Manifest.Id == manifest.Id))
        {
            _logger.LogWarning("Duplicate module id '{Id}' at {Path}, skipping", manifest.Id, manifestPath);
            return false;
        }

        return true;
    }
}
