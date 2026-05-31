using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using TextForge.Api.Controllers;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;

namespace TextForge.Api.Tests;

public sealed class ScenesControllerTests
{
    [Fact]
    public async Task PatchScene_UpdatesChecklistItems_AndSavesBook()
    {
        var sceneId = Guid.NewGuid();
        var book = TestData.BookWithScene(sceneId);
        var workspace = new FakeWorkspace(book);
        var storage = new FakeBookStorage();
        var sut = new ScenesController(workspace, storage, NullLogger<ScenesController>.Instance);

        var request = new PatchSceneBody(
            Title: null,
            Status: null,
            Pov: null,
            CharacterIds: null,
            Notes: null,
            ChecklistItems:
            [
                new ChecklistItemBody(Guid.NewGuid().ToString(), "Outline hook", false),
                new ChecklistItemBody(Guid.NewGuid().ToString(), "Raise stakes", true),
            ]);

        var result = await sut.PatchScene(sceneId, request, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        storage.SaveBookCalls.Should().Be(1);

        var scene = book.Chapters[0].Scenes[0];
        scene.ChecklistItems.Should().HaveCount(2);
        scene.ChecklistItems[0].Text.Should().Be("Outline hook");
        scene.ChecklistItems[0].Done.Should().BeFalse();
        scene.ChecklistItems[1].Text.Should().Be("Raise stakes");
        scene.ChecklistItems[1].Done.Should().BeTrue();
    }

    [Fact]
    public async Task PatchScene_WithInvalidChecklistId_ThrowsFormatException()
    {
        var sceneId = Guid.NewGuid();
        var book = TestData.BookWithScene(sceneId);
        var workspace = new FakeWorkspace(book);
        var storage = new FakeBookStorage();
        var sut = new ScenesController(workspace, storage, NullLogger<ScenesController>.Instance);

        var request = new PatchSceneBody(
            Title: null,
            Status: null,
            Pov: null,
            CharacterIds: null,
            Notes: null,
            ChecklistItems:
            [
                new ChecklistItemBody("not-a-guid", "Broken", false),
            ]);

        var act = () => sut.PatchScene(sceneId, request, CancellationToken.None);

        await act.Should().ThrowAsync<FormatException>();
    }

    [Fact]
    public async Task GetScene_WhenBookNotFound_ReturnsNotFound()
    {
        var workspace = new FakeWorkspace(book: null);
        var storage = new FakeBookStorage();
        var sut = new ScenesController(workspace, storage, NullLogger<ScenesController>.Instance);

        var result = await sut.GetScene(Guid.NewGuid(), CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>();
        var dto = ((NotFoundObjectResult)result).Value as ErrorDto;
        dto.Should().NotBeNull();
        dto!.Message.Should().Be("Scene not found.");
    }

    private static class TestData
    {
        public static BookProject BookWithScene(Guid sceneId)
        {
            var scene = new Scene
            {
                Id = sceneId,
                Title = "Scene 1",
                FilePath = "manuscript/ch1/scene1.md",
                SortOrder = 1,
                Content = "Hello",
            };

            var chapter = new Chapter
            {
                Id = Guid.NewGuid(),
                Title = "Chapter 1",
                FolderPath = "manuscript/ch1",
                SortOrder = 1,
            };
            chapter.Scenes.Add(scene);

            var book = new BookProject
            {
                Id = Guid.NewGuid(),
                RootPath = Path.GetTempPath(),
            };
            book.Chapters.Add(chapter);

            return book;
        }
    }

    private sealed class FakeWorkspace : ISeriesWorkspaceService
    {
        private readonly BookProject? _book;

        public FakeWorkspace(BookProject? book) => _book = book;

        public BookProject? FindBookByScene(Guid sceneId) => _book;

        public void ClearDirtyScene(Guid sceneId) { }

        public Task<Series> CreateSeriesAsync(string title, string parentDirectory, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> AddBookAsync(string title, CancellationToken ct = default) => throw new NotImplementedException();
        public Task RemoveBookAsync(Guid bookId, CancellationToken ct = default) => throw new NotImplementedException();
        public Series? GetCurrentSeries() => null;
        public Task SaveSeriesAsync(CancellationToken ct = default) => throw new NotImplementedException();
        public void CloseSeries() => throw new NotImplementedException();
        public BookProject? GetBook(Guid bookId) => _book;
        public void TrackDirtyScene(Guid sceneId) => throw new NotImplementedException();
        public IReadOnlyCollection<Guid> GetDirtySceneIds() => [];
    }

    private sealed class FakeBookStorage : IBookStorageService
    {
        public int SaveBookCalls { get; private set; }

        public Task<BookProject> CreateBookAsync(TextForge.Core.Requests.CreateBookRequest request, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> OpenBookAsync(string bookFilePath, CancellationToken ct = default) => throw new NotImplementedException();

        public Task SaveBookAsync(BookProject book, CancellationToken ct = default)
        {
            SaveBookCalls++;
            return Task.CompletedTask;
        }

        public Task<Scene?> GetSceneAsync(BookProject book, Guid sceneId, CancellationToken ct = default)
            => Task.FromResult(book.Chapters.SelectMany(c => c.Scenes).FirstOrDefault(s => s.Id == sceneId));

        public Task SaveSceneContentAsync(BookProject book, Guid sceneId, string content, CancellationToken ct = default)
            => Task.CompletedTask;
    }
}
