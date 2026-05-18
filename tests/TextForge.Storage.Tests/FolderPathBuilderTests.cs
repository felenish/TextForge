using FluentAssertions;
using TextForge.Storage.Utilities;

namespace TextForge.Storage.Tests;

public sealed class FolderPathBuilderTests : IDisposable
{
    private readonly string _tempDir;

    public FolderPathBuilderTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"TextForgeFolderTests_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
    }

    [Fact]
    public void BuildBookFolder_ProducesUniqueName_WhenCollisionExists()
    {
        var first = FolderPathBuilder.BuildBookFolder(_tempDir, "My Novel");
        Directory.CreateDirectory(first);

        var second = FolderPathBuilder.BuildBookFolder(_tempDir, "My Novel");

        second.Should().NotBe(first);
        Path.GetFileName(second).Should().StartWith("my-novel");
    }
}
