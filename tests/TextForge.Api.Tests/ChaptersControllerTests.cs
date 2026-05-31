using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Controllers;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;

namespace TextForge.Api.Tests;

public sealed class ChaptersControllerTests
{
    [Fact]
    public async Task ReorderChapters_UpdatesSortOrder_AndPersists()
    {
        var c1 = new Chapter { Id = Guid.NewGuid(), Title = "One", SortOrder = 1 };
        var c2 = new Chapter { Id = Guid.NewGuid(), Title = "Two", SortOrder = 2 };
        var c3 = new Chapter { Id = Guid.NewGuid(), Title = "Three", SortOrder = 3 };

        var book = new BookProject
        {
            Id = Guid.NewGuid(),
            Title = "Book",
            RootPath = Path.GetTempPath(),
        };
        book.Chapters.AddRange([c1, c2, c3]);

        var workspace = new FakeWorkspace(book);
        var storage = new FakeBookStorage();
        var sut = new ChaptersController(workspace, storage);

        var result = await sut.ReorderChapters(
            book.Id,
            new ReorderBody([c3.Id.ToString(), c1.Id.ToString()]),
            CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        storage.SaveBookCalls.Should().Be(1);

        book.Chapters.Should().HaveCount(2);
        book.Chapters[0].Id.Should().Be(c3.Id);
        book.Chapters[0].SortOrder.Should().Be(1);
        book.Chapters[1].Id.Should().Be(c1.Id);
        book.Chapters[1].SortOrder.Should().Be(2);
    }

    [Fact]
    public async Task ReorderScenes_WhenChapterMissing_ReturnsNotFound()
    {
        var book = new BookProject
        {
            Id = Guid.NewGuid(),
            Title = "Book",
            RootPath = Path.GetTempPath(),
        };
        book.Chapters.Add(new Chapter { Id = Guid.NewGuid(), Title = "Only", SortOrder = 1 });

        var sut = new ChaptersController(new FakeWorkspace(book), new FakeBookStorage());

        var result = await sut.ReorderScenes(
            book.Id,
            Guid.NewGuid(),
            new ReorderBody([]),
            CancellationToken.None);

        var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFound.Value.Should().BeOfType<ErrorDto>().Which.Message.Should().Be("Chapter not found.");
    }

    private sealed class FakeWorkspace : ISeriesWorkspaceService
    {
        private readonly BookProject _book;

        public FakeWorkspace(BookProject book) => _book = book;

        public BookProject? GetBook(Guid bookId) => _book.Id == bookId ? _book : null;

        public Task<Series> CreateSeriesAsync(string title, string parentDirectory, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> AddBookAsync(string title, CancellationToken ct = default) => throw new NotImplementedException();
        public Task RemoveBookAsync(Guid bookId, CancellationToken ct = default) => throw new NotImplementedException();
        public Series? GetCurrentSeries() => throw new NotImplementedException();
        public Task SaveSeriesAsync(CancellationToken ct = default) => throw new NotImplementedException();
        public void CloseSeries() => throw new NotImplementedException();
        public BookProject? FindBookByScene(Guid sceneId) => throw new NotImplementedException();
        public void TrackDirtyScene(Guid sceneId) => throw new NotImplementedException();
        public void ClearDirtyScene(Guid sceneId) => throw new NotImplementedException();
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

        public Task<Scene?> GetSceneAsync(BookProject book, Guid sceneId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task SaveSceneContentAsync(BookProject book, Guid sceneId, string content, CancellationToken ct = default) => throw new NotImplementedException();
    }
}
