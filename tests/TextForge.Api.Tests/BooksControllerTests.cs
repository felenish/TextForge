using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Controllers;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;
using TextForge.Core.Requests;

namespace TextForge.Api.Tests;

public sealed class BooksControllerTests
{
    [Fact]
    public void GetBook_WhenBookNotFound_ReturnsNotFound()
    {
        var workspace = new FakeWorkspace(book: null);
        var sut = new BooksController(workspace, new FakeBookStorage());

        var result = sut.GetBook(Guid.NewGuid());

        var notFound = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFound.Value.Should().BeOfType<ErrorDto>().Which.Message.Should().Be("Book not found.");
    }

    [Fact]
    public void GetBook_WhenBookExists_ReturnsDto()
    {
        var book = MakeBook();
        var workspace = new FakeWorkspace(book);
        var sut = new BooksController(workspace, new FakeBookStorage());

        var result = sut.GetBook(book.Id);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<BookDto>().Which.Id.Should().Be(book.Id);
    }

    [Fact]
    public async Task PatchBook_WhenBookNotFound_ReturnsNotFound()
    {
        var workspace = new FakeWorkspace(book: null);
        var sut = new BooksController(workspace, new FakeBookStorage());

        var result = await sut.PatchBook(Guid.NewGuid(), new PatchBookBody(Title: "New"), CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Be("Book not found.");
    }

    [Fact]
    public async Task PatchBook_WithTitle_UpdatesTitleAndSaves()
    {
        var book = MakeBook();
        var storage = new FakeBookStorage();
        var workspace = new FakeWorkspace(book);
        var sut = new BooksController(workspace, storage);

        var result = await sut.PatchBook(book.Id, new PatchBookBody(Title: "Updated Title"), CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<BookDto>().Which.Title.Should().Be("Updated Title");
        book.Title.Should().Be("Updated Title");
        storage.SaveBookCalls.Should().Be(1);
    }

    [Fact]
    public async Task PatchBook_WithNullTitle_SkipsUpdateAndStillSaves()
    {
        var book = MakeBook();
        book.Title = "Original";
        var storage = new FakeBookStorage();
        var workspace = new FakeWorkspace(book);
        var sut = new BooksController(workspace, storage);

        var result = await sut.PatchBook(book.Id, new PatchBookBody(Title: null), CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        book.Title.Should().Be("Original");
        storage.SaveBookCalls.Should().Be(1);
    }

    private static BookProject MakeBook() => new()
    {
        Id = Guid.NewGuid(),
        Title = "Test Book",
        RootPath = Path.GetTempPath(),
    };

    private sealed class FakeWorkspace : ISeriesWorkspaceService
    {
        private readonly BookProject? _book;

        public FakeWorkspace(BookProject? book) => _book = book;

        public BookProject? GetBook(Guid bookId) => _book;

        public Series? GetCurrentSeries() => null;
        public Task<Series> CreateSeriesAsync(string title, string parentDirectory, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> AddBookAsync(string title, CancellationToken ct = default) => throw new NotImplementedException();
        public Task RemoveBookAsync(Guid bookId, CancellationToken ct = default) => throw new NotImplementedException();
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

        public Task SaveBookAsync(BookProject book, CancellationToken ct = default)
        {
            SaveBookCalls++;
            return Task.CompletedTask;
        }

        public Task<BookProject> CreateBookAsync(CreateBookRequest request, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> OpenBookAsync(string bookFilePath, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Scene?> GetSceneAsync(BookProject book, Guid sceneId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task SaveSceneContentAsync(BookProject book, Guid sceneId, string content, CancellationToken ct = default) => throw new NotImplementedException();
    }
}
