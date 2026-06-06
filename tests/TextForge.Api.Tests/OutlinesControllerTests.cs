using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Controllers;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;
using TextForge.Core.Requests;

namespace TextForge.Api.Tests;

public sealed class OutlinesControllerTests
{
    // ── No series open ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.GetAll(CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task GetOne_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.GetOne(Guid.NewGuid(), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task Create_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.Create(new CreateOutlineBody("Act 1"), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task Patch_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.Patch(Guid.NewGuid(), new PatchOutlineBody(null), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task Put_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.Put(Guid.NewGuid(), new PutOutlineBody("Act 1", "Content"), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task Delete_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.Delete(Guid.NewGuid(), CancellationToken.None);
        AssertNoSeries(result);
    }

    // ── Not found ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetOne_WhenOutlineNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.GetOne(Guid.NewGuid(), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Be("Outline not found.");
    }

    [Fact]
    public async Task Patch_WhenOutlineNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.Patch(Guid.NewGuid(), new PatchOutlineBody("New Name"), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Put_WhenOutlineNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.Put(Guid.NewGuid(), new PutOutlineBody("Act 1", "Body"), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ── Happy paths ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsMetaWithoutContent()
    {
        var outline = MakeOutline(content: "Hidden content");
        var storage = new FakeOutlineStorage(outline);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.GetAll(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dtos = ok.Value.Should().BeAssignableTo<IEnumerable<OutlineDto>>().Subject;
        var dto = dtos.Should().ContainSingle().Subject;
        dto.Id.Should().Be(outline.Id);
        dto.Content.Should().BeNull();
    }

    [Fact]
    public async Task GetOne_ReturnsFullDtoWithContent()
    {
        var outline = MakeOutline(content: "Full content here");
        var storage = new FakeOutlineStorage(outline);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.GetOne(outline.Id, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<OutlineDto>().Subject;
        dto.Content.Should().Be("Full content here");
    }

    [Fact]
    public async Task Create_ReturnsDtoWithAssignedName()
    {
        var storage = new FakeOutlineStorage();
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.Create(new CreateOutlineBody("Act 1"), CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<OutlineDto>().Which.Name.Should().Be("Act 1");
    }

    [Fact]
    public async Task Delete_CallsStorageAndReturnsNoContent()
    {
        var outline = MakeOutline();
        var storage = new FakeOutlineStorage(outline);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.Delete(outline.Id, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        storage.DeleteCalls.Should().Be(1);
    }

    [Fact]
    public async Task Patch_WithNullName_SkipsUpdate()
    {
        var outline = MakeOutline();
        outline.Name = "Original";
        var storage = new FakeOutlineStorage(outline);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        await sut.Patch(outline.Id, new PatchOutlineBody(Name: null), CancellationToken.None);

        outline.Name.Should().Be("Original");
        storage.SaveCalls.Should().Be(1);
    }

    [Fact]
    public async Task Patch_WithName_RenamesAndSaves()
    {
        var outline = MakeOutline();
        var storage = new FakeOutlineStorage(outline);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.Patch(outline.Id, new PatchOutlineBody(Name: "Act 2"), CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        outline.Name.Should().Be("Act 2");
        storage.SaveCalls.Should().Be(1);
    }

    [Fact]
    public async Task Patch_ReturnsMeta_NotFullDto()
    {
        var outline = MakeOutline(content: "Some content");
        var storage = new FakeOutlineStorage(outline);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.Patch(outline.Id, new PatchOutlineBody(Name: "New Name"), CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<OutlineDto>().Which.Content.Should().BeNull();
    }

    [Fact]
    public async Task Put_EmptyContent_CoercesToNull()
    {
        var outline = MakeOutline();
        var storage = new FakeOutlineStorage(outline);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        await sut.Put(outline.Id, new PutOutlineBody("Act 1", Content: ""), CancellationToken.None);

        outline.Content.Should().BeNull();
    }

    [Fact]
    public async Task Put_SetsNameAndContent()
    {
        var outline = MakeOutline();
        var storage = new FakeOutlineStorage(outline);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.Put(outline.Id, new PutOutlineBody("Act 3", "The climax"), CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        outline.Name.Should().Be("Act 3");
        outline.Content.Should().Be("The climax");
        storage.SaveCalls.Should().Be(1);
    }

    [Fact]
    public async Task Put_ReturnsFullDto()
    {
        var outline = MakeOutline();
        var storage = new FakeOutlineStorage(outline);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.Put(outline.Id, new PutOutlineBody("Act 3", "The climax"), CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<OutlineDto>().Which.Content.Should().Be("The climax");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static OutlinesController MakeSut(Series? series, FakeOutlineStorage? storage = null) =>
        new(new FakeWorkspace(series), storage ?? new FakeOutlineStorage());

    private static Series MakeSeries() => new() { RootPath = Path.GetTempPath(), Title = "Test" };

    private static Outline MakeOutline(string? content = null) =>
        new() { Id = Guid.NewGuid(), Name = "Act 1", Content = content };

    private static void AssertNoSeries(IActionResult result) =>
        result.Should().BeOfType<BadRequestObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Be("No series is open.");

    private sealed class FakeWorkspace : ISeriesWorkspaceService
    {
        private readonly Series? _series;

        public FakeWorkspace(Series? series) => _series = series;

        public Series? GetCurrentSeries() => _series;

        public Task<Series> CreateSeriesAsync(string title, string parentDirectory, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> AddBookAsync(string title, CancellationToken ct = default) => throw new NotImplementedException();
        public Task RemoveBookAsync(Guid bookId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task SaveSeriesAsync(CancellationToken ct = default) => throw new NotImplementedException();
        public void CloseSeries() => throw new NotImplementedException();
        public BookProject? GetBook(Guid bookId) => throw new NotImplementedException();
        public BookProject? FindBookByScene(Guid sceneId) => throw new NotImplementedException();
        public void TrackDirtyScene(Guid sceneId) => throw new NotImplementedException();
        public void ClearDirtyScene(Guid sceneId) => throw new NotImplementedException();
        public IReadOnlyCollection<Guid> GetDirtySceneIds() => [];
    }

    private sealed class FakeOutlineStorage : IOutlineStorageService
    {
        private readonly Outline? _outline;

        public int SaveCalls { get; private set; }
        public int DeleteCalls { get; private set; }

        public FakeOutlineStorage(Outline? outline = null) => _outline = outline;

        public void EnsureFolder(string outlinesPath) { }

        public Task<IReadOnlyList<Outline>> GetAllAsync(string outlinesPath, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Outline>>(_outline is null ? [] : [_outline]);

        public Task<Outline> CreateAsync(string outlinesPath, string name, CancellationToken ct = default) =>
            Task.FromResult(new Outline { Id = Guid.NewGuid(), Name = name });

        public Task<Outline?> GetAsync(string outlinesPath, Guid id, CancellationToken ct = default) =>
            Task.FromResult(_outline?.Id == id ? _outline : null);

        public Task SaveAsync(string outlinesPath, Outline outline, CancellationToken ct = default)
        {
            SaveCalls++;
            return Task.CompletedTask;
        }

        public Task DeleteAsync(string outlinesPath, Guid id, CancellationToken ct = default)
        {
            DeleteCalls++;
            return Task.CompletedTask;
        }

        public Task ReorderAsync(string outlinesPath, IReadOnlyList<Guid> ids, CancellationToken ct = default)
            => Task.CompletedTask;
    }
}
