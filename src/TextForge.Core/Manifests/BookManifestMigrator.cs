using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;

namespace TextForge.Core.Manifests;

/// <summary>
/// Applies the registered <see cref="IBookManifestMigration"/> steps in order until the
/// manifest reaches <see cref="BookManifest.CurrentVersion"/>.
/// </summary>
public sealed class BookManifestMigrator
{
    private readonly IReadOnlyList<IBookManifestMigration> _migrations;
    private readonly ILogger<BookManifestMigrator> _logger;

    public BookManifestMigrator(
        IEnumerable<IBookManifestMigration> migrations,
        ILogger<BookManifestMigrator> logger)
    {
        _migrations = [.. migrations.OrderBy(m => m.FromVersion)];
        _logger = logger;
    }

    /// <summary>
    /// Mutates <paramref name="manifest"/> in place, running all applicable migrations.
    /// Returns true if any migration was applied (caller should write the updated file).
    /// </summary>
    public bool MigrateIfNeeded(JsonObject manifest)
    {
        var version = manifest["version"]?.GetValue<int>() ?? 0;
        if (version >= BookManifest.CurrentVersion)
            return false;

        var anyApplied = false;
        foreach (var migration in _migrations)
        {
            var current = manifest["version"]?.GetValue<int>() ?? 0;
            if (current != migration.FromVersion)
                continue;

            _logger.LogInformation(
                "Migrating book manifest from version {From} to {To}",
                migration.FromVersion, migration.ToVersion);

            migration.Migrate(manifest);
            manifest["version"] = migration.ToVersion;
            anyApplied = true;
        }

        return anyApplied;
    }
}
