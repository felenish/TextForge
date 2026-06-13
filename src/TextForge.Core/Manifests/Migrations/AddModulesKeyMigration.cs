using System.Text.Json.Nodes;

namespace TextForge.Core.Manifests.Migrations;

/// <summary>
/// Migrates book.tfbook from version 1 to version 2 by adding the "modules" key
/// with empty enabled/versions collections.
/// </summary>
public sealed class AddModulesKeyMigration : IBookManifestMigration
{
    public int FromVersion => 1;
    public int ToVersion => 2;

    public void Migrate(JsonObject manifest)
    {
        if (manifest.ContainsKey("modules"))
            return;

        manifest["modules"] = new JsonObject
        {
            ["enabled"] = new JsonArray(),
            ["versions"] = new JsonObject(),
        };
    }
}
