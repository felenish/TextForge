using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using TextForge.Modules;

namespace TextForge.Modules.Tests;

public sealed class ModuleRegistryTests : IDisposable
{
    private readonly string _tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
    private readonly ModuleRegistry _sut = new(NullLogger<ModuleRegistry>.Instance);

    public ModuleRegistryTests() => Directory.CreateDirectory(_tempDir);

    public void Dispose() => Directory.Delete(_tempDir, recursive: true);

    // ── Discover ─────────────────────────────────────────────────────────────

    [Fact]
    public void Discover_WhenPathDoesNotExist_DoesNotThrow()
    {
        var action = () => _sut.Discover(Path.Combine(_tempDir, "nonexistent"));
        action.Should().NotThrow();
        _sut.Modules.Should().BeEmpty();
    }

    [Fact]
    public void Discover_ValidModule_IsRegistered()
    {
        WriteManifest("corkboard", new
        {
            id = "com.example.corkboard",
            name = "Cork Board",
            version = "1.0.0",
            minTextForgeVersion = "1.2.0",
            storageFolder = "corkboard",
        });

        _sut.Discover(_tempDir);

        _sut.Modules.Should().ContainSingle();
        var reg = _sut.Modules[0];
        reg.Manifest.Id.Should().Be("com.example.corkboard");
        reg.Manifest.Name.Should().Be("Cork Board");
        reg.Manifest.Version.Should().Be("1.0.0");
    }

    [Fact]
    public void Discover_MultipleModules_AllRegistered()
    {
        WriteManifest("mod1", new { id = "com.a.one", name = "One", version = "1.0.0", storageFolder = "one" });
        WriteManifest("mod2", new { id = "com.a.two", name = "Two", version = "2.0.0", storageFolder = "two" });

        _sut.Discover(_tempDir);

        _sut.Modules.Should().HaveCount(2);
    }

    [Fact]
    public void Discover_SubdirWithNoManifest_IsSkipped()
    {
        Directory.CreateDirectory(Path.Combine(_tempDir, "empty-module"));

        _sut.Discover(_tempDir);

        _sut.Modules.Should().BeEmpty();
    }

    [Fact]
    public void Discover_DuplicateId_SecondIsSkipped()
    {
        WriteManifest("mod1", new { id = "com.a.dupe", name = "First", version = "1.0.0", storageFolder = "first" });
        WriteManifest("mod2", new { id = "com.a.dupe", name = "Second", version = "1.0.0", storageFolder = "second" });

        _sut.Discover(_tempDir);

        _sut.Modules.Should().ContainSingle();
    }

    // ── Validation — path traversal ──────────────────────────────────────────

    [Theory]
    [InlineData("../traversal")]
    [InlineData("evil/path")]
    [InlineData("evil\\path")]
    public void Discover_IdWithPathTraversal_IsRejected(string badId)
    {
        WriteManifest("bad", new { id = badId, name = "Bad", version = "1.0.0", storageFolder = "ok" });

        _sut.Discover(_tempDir);

        _sut.Modules.Should().BeEmpty();
    }

    [Theory]
    [InlineData("../traversal")]
    [InlineData("sub/folder")]
    [InlineData("sub\\folder")]
    public void Discover_StorageFolderWithPathTraversal_IsRejected(string badFolder)
    {
        WriteManifest("bad", new { id = "com.a.bad", name = "Bad", version = "1.0.0", storageFolder = badFolder });

        _sut.Discover(_tempDir);

        _sut.Modules.Should().BeEmpty();
    }

    // ── Validation — required fields ─────────────────────────────────────────

    [Fact]
    public void Discover_MissingId_IsRejected()
    {
        WriteManifest("bad", new { name = "No Id", version = "1.0.0", storageFolder = "x" });
        _sut.Discover(_tempDir);
        _sut.Modules.Should().BeEmpty();
    }

    [Fact]
    public void Discover_MissingName_IsRejected()
    {
        WriteManifest("bad", new { id = "com.a.noname", version = "1.0.0", storageFolder = "x" });
        _sut.Discover(_tempDir);
        _sut.Modules.Should().BeEmpty();
    }

    [Fact]
    public void Discover_MissingStorageFolder_IsRejected()
    {
        WriteManifest("bad", new { id = "com.a.nofolder", name = "No Folder", version = "1.0.0" });
        _sut.Discover(_tempDir);
        _sut.Modules.Should().BeEmpty();
    }

    // ── Get / GetStoragePath ─────────────────────────────────────────────────

    [Fact]
    public void Get_KnownId_ReturnsRegistration()
    {
        WriteManifest("mod", new { id = "com.a.mod", name = "Mod", version = "1.0.0", storageFolder = "mod" });
        _sut.Discover(_tempDir);

        _sut.Get("com.a.mod").Should().NotBeNull();
    }

    [Fact]
    public void Get_UnknownId_ReturnsNull()
    {
        _sut.Get("com.a.unknown").Should().BeNull();
    }

    [Fact]
    public void GetStoragePath_ReturnsExpectedPath()
    {
        WriteManifest("mod", new { id = "com.a.mod", name = "Mod", version = "1.0.0", storageFolder = "mydata" });
        _sut.Discover(_tempDir);

        var projectRoot = @"C:\Projects\MyNovel";
        var path = _sut.GetStoragePath(projectRoot, "com.a.mod");

        path.Should().Be(Path.Combine(projectRoot, "modules", "mydata"));
    }

    [Fact]
    public void GetStoragePath_UnknownModule_Throws()
    {
        var action = () => _sut.GetStoragePath(@"C:\Projects\MyNovel", "com.a.unknown");
        action.Should().Throw<InvalidOperationException>();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void WriteManifest(string subdirName, object manifest)
    {
        var dir = Path.Combine(_tempDir, subdirName);
        Directory.CreateDirectory(dir);
        var json = JsonSerializer.Serialize(manifest, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });
        File.WriteAllText(Path.Combine(dir, "module.json"), json);
    }
}
