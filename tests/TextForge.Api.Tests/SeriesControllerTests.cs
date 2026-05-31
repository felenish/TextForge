using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Controllers;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;

namespace TextForge.Api.Tests;

public sealed class SeriesControllerTests
{
    [Fact]
    public async Task AddBook_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var workspace = new FakeWorkspace { CurrentSeries = null };
        var sut = new SeriesController(workspace, new FakeBookStorage());

        var result = await sut.AddBook(new AddBookToSeriesBody("Book"), CancellationToken.None);

        var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        bad.Value.Should().BeOfType<ErrorDto>().Which.Message.Should().Be("No series is open.");
    }

    [Fact]
    public async Task ReorderBooks_ReordersExistingBooks_AndIgnoresInvalidIds()
    {
        var b1 = new BookProject { Id = Guid.NewGuid(), Title = "Book 1" };
        var b2 = new BookProject { Id = Guid.NewGuid(), Title = "Book 2" };
        var b3 = new BookProject { Id = Guid.NewGuid(), Title = "Book 3" };

        var workspace = new FakeWorkspace
        {
            CurrentSeries = new Series
            {
                Id = Guid.NewGuid(),
                Title = "Series",
                RootPath = Path.GetTempPath(),
            },
        };
        workspace.CurrentSeries.Books.AddRange([b1, b2, b3]);

        var sut = new SeriesController(workspace, new FakeBookStorage());

        var result = await sut.ReorderBooks(
            new ReorderBooksBody([b3.Id.ToString(), "not-a-guid", b1.Id.ToString()]),
            CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        workspace.SaveSeriesCalls.Should().Be(1);
        workspace.CurrentSeries!.Books.Select(b => b.Id).Should().ContainInOrder(b3.Id, b1.Id);
    }

    [Fact]
    public async Task SearchSeries_WhenQueryTooShort_ReturnsEmpty()
    {
        var workspace = new FakeWorkspace
        {
            CurrentSeries = new Series
            {
                Id = Guid.NewGuid(),
                Title = "Series",
                RootPath = Path.GetTempPath(),
            },
        };

        var sut = new SeriesController(workspace, new FakeBookStorage());

        var result = await sut.SearchSeries("a", CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var rows = ok.Value.Should().BeAssignableTo<IEnumerable<SceneSearchResultDto>>().Subject;
        rows.Should().BeEmpty();
    }

    private sealed class FakeWorkspace : ISeriesWorkspaceService
    {
        public Series? CurrentSeries { get; set; }
        public int SaveSeriesCalls { get; private set; }

        public Task<Series> CreateSeriesAsync(string title, string parentDirectory, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> AddBookAsync(string title, CancellationToken ct = default) => throw new NotImplementedException();
        public Task RemoveBookAsync(Guid bookId, CancellationToken ct = default) => throw new NotImplementedException();
        public Series? GetCurrentSeries() => CurrentSeries;
        public Task SaveSeriesAsync(CancellationToken ct = default)
        {
            SaveSeriesCalls++;
            return Task.CompletedTask;
        }

        public void CloseSeries() => CurrentSeries = null;
        public BookProject? GetBook(Guid bookId) => CurrentSeries?.Books.FirstOrDefault(b => b.Id == bookId);
        public BookProject? FindBookByScene(Guid sceneId) => throw new NotImplementedException();
        public void TrackDirtyScene(Guid sceneId) => throw new NotImplementedException();
        public void ClearDirtyScene(Guid sceneId) => throw new NotImplementedException();
        public IReadOnlyCollection<Guid> GetDirtySceneIds() => [];
    }

    private sealed class FakeBookStorage : IBookStorageService
    {
        public Task<BookProject> CreateBookAsync(TextForge.Core.Requests.CreateBookRequest request, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> OpenBookAsync(string bookFilePath, CancellationToken ct = default) => throw new NotImplementedException();
        public Task SaveBookAsync(BookProject book, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Scene?> GetSceneAsync(BookProject book, Guid sceneId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task SaveSceneContentAsync(BookProject book, Guid sceneId, string content, CancellationToken ct = default) => throw new NotImplementedException();
    }
}
