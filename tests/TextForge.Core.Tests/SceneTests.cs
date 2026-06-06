using FluentAssertions;
using TextForge.Core.Models;

namespace TextForge.Core.Tests;

public sealed class SceneTests
{
    [Fact]
    public void Scene_InitializesChecklistItems_AsEmptyList()
    {
        var scene = new Scene();

        scene.ChecklistItems.Should().NotBeNull();
        scene.ChecklistItems.Should().BeEmpty();
    }
}
