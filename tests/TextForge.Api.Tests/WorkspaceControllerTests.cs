using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Controllers;
using TextForge.Api.Interfaces;
using TextForge.Core.Models;

namespace TextForge.Api.Tests;

public sealed class WorkspaceControllerTests
{
    [Fact]
    public void GetVersion_ReturnsVersionString()
    {
        var sut = new WorkspaceController(new FakeWorkspace());

        var result = sut.GetVersion();

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var version = ok.Value!.GetType().GetProperty("version")!.GetValue(ok.Value) as string;
        version.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void GetDirtyScenes_WhenNone_ReturnsEmptyArray()
    {
        var sut = new WorkspaceController(new FakeWorkspace());

        var result = sut.GetDirtyScenes();

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeAssignableTo<string[]>().Which.Should().BeEmpty();
    }

    [Fact]
    public void GetDirtyScenes_ReturnsTrackedIds()
    {
        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        var workspace = new FakeWorkspace();
        workspace.TrackDirtyScene(id1);
        workspace.TrackDirtyScene(id2);
        var sut = new WorkspaceController(workspace);

        var result = sut.GetDirtyScenes();

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var ids = ok.Value.Should().BeAssignableTo<string[]>().Subject;
        ids.Should().BeEquivalentTo([id1.ToString(), id2.ToString()]);
    }

    [Fact]
    public void MarkDirty_TracksSceneAndReturnsNoContent()
    {
        var workspace = new FakeWorkspace();
        var sut = new WorkspaceController(workspace);
        var sceneId = Guid.NewGuid();

        var result = sut.MarkDirty(sceneId);

        result.Should().BeOfType<NoContentResult>();
        workspace.DirtySceneIds.Should().Contain(sceneId);
    }

    [Fact]
    public void MarkDirty_CalledTwiceWithSameId_IsIdempotent()
    {
        var workspace = new FakeWorkspace();
        var sut = new WorkspaceController(workspace);
        var sceneId = Guid.NewGuid();

        sut.MarkDirty(sceneId);
        sut.MarkDirty(sceneId);

        // TrackDirtyScene may be called twice; GetDirtySceneIds should still list it
        workspace.DirtySceneIds.Should().Contain(sceneId);
    }

    private sealed class FakeWorkspace : ISeriesWorkspaceService
    {
        private readonly HashSet<Guid> _dirty = [];

        public IReadOnlyCollection<Guid> DirtySceneIds => _dirty;

        public void TrackDirtyScene(Guid sceneId) => _dirty.Add(sceneId);
        public void ClearDirtyScene(Guid sceneId) => _dirty.Remove(sceneId);
        public IReadOnlyCollection<Guid> GetDirtySceneIds() => _dirty;

        public Series? GetCurrentSeries() => null;
        public Task<Series> CreateSeriesAsync(string title, string parentDirectory, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> AddBookAsync(string title, CancellationToken ct = default) => throw new NotImplementedException();
        public Task RemoveBookAsync(Guid bookId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task SaveSeriesAsync(CancellationToken ct = default) => throw new NotImplementedException();
        public void CloseSeries() => throw new NotImplementedException();
        public BookProject? GetBook(Guid bookId) => throw new NotImplementedException();
        public BookProject? FindBookByScene(Guid sceneId) => throw new NotImplementedException();
    }
}
