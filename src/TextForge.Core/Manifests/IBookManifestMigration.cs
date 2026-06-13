using System.Text.Json.Nodes;

namespace TextForge.Core.Manifests;

/// <summary>
/// A single step in the book.tfbook migration chain.
/// Implementations are discovered via DI and applied in FromVersion order.
/// Each migration must be idempotent.
/// </summary>
public interface IBookManifestMigration
{
    int FromVersion { get; }
    int ToVersion { get; }

    /// <summary>Mutates the parsed JSON document in place.</summary>
    void Migrate(JsonObject manifest);
}
