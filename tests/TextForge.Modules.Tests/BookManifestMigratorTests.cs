using System.Text.Json.Nodes;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using TextForge.Core.Manifests;
using TextForge.Core.Manifests.Migrations;

namespace TextForge.Modules.Tests;

public sealed class BookManifestMigratorTests
{
    // ── No migration needed ───────────────────────────────────────────────────

    [Fact]
    public void MigrateIfNeeded_AlreadyCurrentVersion_ReturnsFalse()
    {
        var manifest = MakeManifest(BookManifest.CurrentVersion);
        var sut = MakeSut();

        var result = sut.MigrateIfNeeded(manifest);

        result.Should().BeFalse();
    }

    [Fact]
    public void MigrateIfNeeded_AlreadyCurrentVersion_DoesNotMutate()
    {
        var manifest = MakeManifest(BookManifest.CurrentVersion);
        manifest["modules"] = new JsonObject { ["enabled"] = new JsonArray(), ["versions"] = new JsonObject() };
        var sut = MakeSut();

        sut.MigrateIfNeeded(manifest);

        manifest["version"]!.GetValue<int>().Should().Be(BookManifest.CurrentVersion);
    }

    // ── Version 1 → 2 (AddModulesKey) ────────────────────────────────────────

    [Fact]
    public void MigrateIfNeeded_Version1_ReturnsTrue()
    {
        var manifest = MakeManifest(1);
        var sut = MakeSut();

        var result = sut.MigrateIfNeeded(manifest);

        result.Should().BeTrue();
    }

    [Fact]
    public void MigrateIfNeeded_Version1_UpgradesVersionToCurrentVersion()
    {
        var manifest = MakeManifest(1);
        var sut = MakeSut();

        sut.MigrateIfNeeded(manifest);

        manifest["version"]!.GetValue<int>().Should().Be(BookManifest.CurrentVersion);
    }

    [Fact]
    public void MigrateIfNeeded_Version1_AddsModulesKey()
    {
        var manifest = MakeManifest(1);
        var sut = MakeSut();

        sut.MigrateIfNeeded(manifest);

        manifest["modules"].Should().NotBeNull();
        manifest["modules"]!["enabled"].Should().NotBeNull();
        manifest["modules"]!["versions"].Should().NotBeNull();
    }

    [Fact]
    public void MigrateIfNeeded_Version1_EnabledIsEmptyArray()
    {
        var manifest = MakeManifest(1);
        var sut = MakeSut();

        sut.MigrateIfNeeded(manifest);

        var enabled = manifest["modules"]!["enabled"]!.AsArray();
        enabled.Should().BeEmpty();
    }

    // ── Idempotency ───────────────────────────────────────────────────────────

    [Fact]
    public void AddModulesKeyMigration_AlreadyHasModulesKey_IsIdempotent()
    {
        var manifest = MakeManifest(1);
        manifest["modules"] = new JsonObject
        {
            ["enabled"] = new JsonArray("com.example.corkboard"),
            ["versions"] = new JsonObject { ["com.example.corkboard"] = "1.0.0" },
        };
        var migration = new AddModulesKeyMigration();

        migration.Migrate(manifest);

        // Existing data must not be overwritten
        manifest["modules"]!["enabled"]!.AsArray().Should().ContainSingle();
    }

    // ── Missing version field (pre-versioning manifests) ─────────────────────

    [Fact]
    public void MigrateIfNeeded_NoVersionField_TreatedAsVersion0_ReturnsFalse()
    {
        // Version 0 has no migration registered — treated as already done or unknown.
        // The migrator skips steps where FromVersion doesn't match current doc version.
        var manifest = new JsonObject { ["title"] = "Old Book" };
        var sut = MakeSut();

        // No migration covers 0→1, so nothing runs
        var result = sut.MigrateIfNeeded(manifest);

        result.Should().BeFalse();
    }

    // ── Multi-step chain ──────────────────────────────────────────────────────

    [Fact]
    public void MigrateIfNeeded_MultipleApplicableSteps_AllApplied()
    {
        // Simulate a future v2→v3 step alongside v1→v2
        var step2To3 = new FakeMigration(fromVersion: 2, toVersion: 3, key: "extraKey");
        var manifest = MakeManifest(1);

        var sut = MakeSut(extraMigrations: [step2To3]);
        sut.MigrateIfNeeded(manifest);

        manifest["version"]!.GetValue<int>().Should().Be(3);
        manifest["modules"].Should().NotBeNull();
        manifest["extraKey"].Should().NotBeNull();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static JsonObject MakeManifest(int version) => new()
    {
        ["version"] = version,
        ["id"] = Guid.NewGuid().ToString(),
        ["title"] = "Test Book",
    };

    private static BookManifestMigrator MakeSut(IEnumerable<IBookManifestMigration>? extraMigrations = null)
    {
        var migrations = new List<IBookManifestMigration> { new AddModulesKeyMigration() };
        if (extraMigrations is not null)
            migrations.AddRange(extraMigrations);

        return new BookManifestMigrator(migrations, NullLogger<BookManifestMigrator>.Instance);
    }

    private sealed class FakeMigration(int fromVersion, int toVersion, string key) : IBookManifestMigration
    {
        public int FromVersion => fromVersion;
        public int ToVersion => toVersion;
        public void Migrate(JsonObject manifest) => manifest[key] = "added";
    }
}
