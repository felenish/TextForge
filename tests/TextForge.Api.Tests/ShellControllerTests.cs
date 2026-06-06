using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Controllers;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;

namespace TextForge.Api.Tests;

public sealed class ShellControllerTests
{
    [Fact]
    public async Task OpenLogFolder_CreatesDirectory_AndOpensIt()
    {
        var dialogs = new FakeShellDialogService();
        var workspace = new FakeWorkspace();
        var sut = new ShellController(dialogs, workspace);

        var result = await sut.OpenLogFolder();

        result.Should().BeOfType<NoContentResult>();
        dialogs.OpenedFolderPath.Should().NotBeNullOrWhiteSpace();
        dialogs.OpenedFolderPath!.Should().EndWith(Path.Combine("TextForge", "logs"));
        Directory.Exists(dialogs.OpenedFolderPath).Should().BeTrue();
    }

    [Fact]
    public async Task Reveal_WhenBookMissing_ReturnsNotFound()
    {
        var dialogs = new FakeShellDialogService();
        var workspace = new FakeWorkspace { BookByScene = null };
        var sut = new ShellController(dialogs, workspace);

        var result = await sut.Reveal(new RevealBody(Guid.NewGuid()));

        result.Should().BeOfType<NotFoundObjectResult>();
        var dto = ((NotFoundObjectResult)result).Value as ErrorDto;
        dto.Should().NotBeNull();
        dto!.Message.Should().Be("Scene not found.");
    }

    private sealed class FakeShellDialogService : IShellDialogService
    {
        public string? OpenedFolderPath { get; private set; }

        public Task<string?> ShowOpenFileDialogAsync(string title, string filter) => Task.FromResult<string?>(null);
        public Task<string?> ShowSaveFileDialogAsync(string title, string filter, string defaultFileName) => Task.FromResult<string?>(null);
        public Task<string?> ShowFolderDialogAsync(string title) => Task.FromResult<string?>(null);
        public Task RevealPathAsync(string absolutePath) => Task.CompletedTask;

        public Task OpenFolderPathAsync(string folderPath)
        {
            OpenedFolderPath = folderPath;
            return Task.CompletedTask;
        }
    }

    private sealed class FakeWorkspace : ISeriesWorkspaceService
    {
        public BookProject? BookByScene { get; set; }

        public BookProject? FindBookByScene(Guid sceneId) => BookByScene;

        public Task<Series> CreateSeriesAsync(string title, string parentDirectory, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> AddBookAsync(string title, CancellationToken ct = default) => throw new NotImplementedException();
        public Task RemoveBookAsync(Guid bookId, CancellationToken ct = default) => throw new NotImplementedException();
        public Series? GetCurrentSeries() => null;
        public Task SaveSeriesAsync(CancellationToken ct = default) => throw new NotImplementedException();
        public void CloseSeries() => throw new NotImplementedException();
        public BookProject? GetBook(Guid bookId) => null;
        public void TrackDirtyScene(Guid sceneId) => throw new NotImplementedException();
        public void ClearDirtyScene(Guid sceneId) => throw new NotImplementedException();
        public IReadOnlyCollection<Guid> GetDirtySceneIds() => [];
    }
}
