namespace TextForge.Modules;

public sealed class ModuleManifest
{
    /// <summary>Reverse-DNS unique identifier. Used as the storage directory name.</summary>
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>SemVer string from the manifest.</summary>
    public string Version { get; set; } = string.Empty;

    public string MinTextForgeVersion { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? Author { get; set; }

    /// <summary>Path to icon asset, relative to the module directory.</summary>
    public string? Icon { get; set; }

    /// <summary>
    /// Path to the JS bundle (UMD or ESM) relative to the module directory.
    /// Null for built-in modules that render from the main app bundle.
    /// </summary>
    public string? EntryPoint { get; set; }

    /// <summary>Subfolder name used inside the project's modules/ directory.</summary>
    public string StorageFolder { get; set; } = string.Empty;

    /// <summary>
    /// True for built-in modules shipped with TextForge. These have no JS bundle;
    /// ModuleLoader renders the existing React component from the main app bundle.
    /// </summary>
    public bool BuiltIn { get; set; }

    /// <summary>
    /// True if this module wants its entities to be reachable via the hyperlink API.
    /// The module's JS bundle must export a resolveLinkable function.
    /// </summary>
    public bool Linkable { get; set; }
}
