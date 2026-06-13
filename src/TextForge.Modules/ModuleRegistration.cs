namespace TextForge.Modules;

public sealed class ModuleRegistration
{
    public ModuleManifest Manifest { get; init; } = null!;

    /// <summary>Absolute path to the directory containing module.json.</summary>
    public string ModuleDirectory { get; init; } = string.Empty;
}
