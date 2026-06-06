using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Controllers;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;
using TextForge.Core.Requests;

namespace TextForge.Api.Tests;

public sealed class LocationsControllerTests
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
        var result = await sut.Create(new CreateLocationBody("Castle"), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task Patch_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.Patch(Guid.NewGuid(), new PatchLocationBody(null), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task Put_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.Put(Guid.NewGuid(), new PutLocationBody("Castle", null, []), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task Delete_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.Delete(Guid.NewGuid(), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task UploadImage_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.UploadImage(Guid.NewGuid(), MakeFormFile("map.jpg"), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task GetImage_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.GetImage(Guid.NewGuid(), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task DeleteImage_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.DeleteImage(Guid.NewGuid(), CancellationToken.None);
        AssertNoSeries(result);
    }

    // ── Not found ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetOne_WhenLocationNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.GetOne(Guid.NewGuid(), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Be("Location not found.");
    }

    [Fact]
    public async Task Patch_WhenLocationNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.Patch(Guid.NewGuid(), new PatchLocationBody("Renamed"), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Put_WhenLocationNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.Put(Guid.NewGuid(), new PutLocationBody("Castle", "A keep", []), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task UploadImage_WhenLocationNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.UploadImage(Guid.NewGuid(), MakeFormFile("map.jpg"), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task DeleteImage_WhenLocationNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.DeleteImage(Guid.NewGuid(), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ── Happy paths ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsAllLocations()
    {
        var location = MakeLocation();
        var storage = new FakeLocationStorage(location);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.GetAll(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dtos = ok.Value.Should().BeAssignableTo<IEnumerable<LocationDto>>().Subject;
        dtos.Should().ContainSingle(l => l.Id == location.Id);
    }

    [Fact]
    public async Task Create_ReturnsDtoWithAssignedName()
    {
        var storage = new FakeLocationStorage();
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.Create(new CreateLocationBody("The Dungeon"), CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<LocationDto>().Which.Name.Should().Be("The Dungeon");
    }

    [Fact]
    public async Task Delete_CallsStorageAndReturnsNoContent()
    {
        var location = MakeLocation();
        var storage = new FakeLocationStorage(location);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.Delete(location.Id, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        storage.DeleteCalls.Should().Be(1);
    }

    [Fact]
    public async Task Patch_WithNullName_SkipsUpdate()
    {
        var location = MakeLocation();
        location.Name = "Original";
        var storage = new FakeLocationStorage(location);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        await sut.Patch(location.Id, new PatchLocationBody(Name: null), CancellationToken.None);

        location.Name.Should().Be("Original");
        storage.SaveCalls.Should().Be(1);
    }

    [Fact]
    public async Task Patch_WithName_UpdatesAndSaves()
    {
        var location = MakeLocation();
        var storage = new FakeLocationStorage(location);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.Patch(location.Id, new PatchLocationBody(Name: "Renamed Keep"), CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        location.Name.Should().Be("Renamed Keep");
        storage.SaveCalls.Should().Be(1);
    }

    [Fact]
    public async Task Put_EmptyDescription_CoercesToNull()
    {
        var location = MakeLocation();
        var storage = new FakeLocationStorage(location);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        await sut.Put(location.Id, new PutLocationBody("Castle", Description: "", CustomSections: []), CancellationToken.None);

        location.Description.Should().BeNull();
    }

    [Fact]
    public async Task Put_SetsNameAndDescription()
    {
        var location = MakeLocation();
        var storage = new FakeLocationStorage(location);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        await sut.Put(location.Id, new PutLocationBody("Tower", "A tall tower", []), CancellationToken.None);

        location.Name.Should().Be("Tower");
        location.Description.Should().Be("A tall tower");
        storage.SaveCalls.Should().Be(1);
    }

    [Fact]
    public async Task UploadImage_InvalidExtension_DefaultsToJpg()
    {
        var location = MakeLocation();
        var storage = new FakeLocationStorage(location);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        await sut.UploadImage(location.Id, MakeFormFile("map.bmp"), CancellationToken.None);

        location.ImageFileName.Should().EndWith(".jpg");
        storage.SaveImageCalls.Should().Be(1);
    }

    [Fact]
    public async Task UploadImage_ValidExtension_PreservesExtension()
    {
        var location = MakeLocation();
        var storage = new FakeLocationStorage(location);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        await sut.UploadImage(location.Id, MakeFormFile("map.webp"), CancellationToken.None);

        location.ImageFileName.Should().EndWith(".webp");
    }

    [Fact]
    public async Task GetImage_WhenImageExists_ReturnsFile()
    {
        var location = MakeLocation();
        var storage = new FakeLocationStorage(location, hasImage: true);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.GetImage(location.Id, CancellationToken.None);

        result.Should().BeOfType<FileStreamResult>();
    }

    [Fact]
    public async Task GetImage_WhenImageMissing_ReturnsNotFound()
    {
        var location = MakeLocation();
        var storage = new FakeLocationStorage(location, hasImage: false);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.GetImage(location.Id, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task DeleteImage_ClearsImageFileNameAndSaves()
    {
        var location = MakeLocation();
        location.ImageFileName = "map.jpg";
        var storage = new FakeLocationStorage(location);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.DeleteImage(location.Id, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        location.ImageFileName.Should().BeNull();
        storage.DeleteImageCalls.Should().Be(1);
        storage.SaveCalls.Should().Be(1);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static LocationsController MakeSut(Series? series, FakeLocationStorage? storage = null) =>
        new(new FakeWorkspace(series), storage ?? new FakeLocationStorage());

    private static Series MakeSeries() => new() { RootPath = Path.GetTempPath(), Title = "Test" };

    private static Location MakeLocation() => new() { Id = Guid.NewGuid(), Name = "Castle" };

    private static IFormFile MakeFormFile(string filename)
    {
        var stream = new MemoryStream([0x89, 0x50]);
        var file = new FormFile(stream, 0, stream.Length, "file", filename)
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/jpeg",
        };
        return file;
    }

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

    private sealed class FakeLocationStorage : ILocationStorageService
    {
        private readonly Location? _location;
        private readonly bool _hasImage;

        public int SaveCalls { get; private set; }
        public int SaveImageCalls { get; private set; }
        public int DeleteCalls { get; private set; }
        public int DeleteImageCalls { get; private set; }

        public FakeLocationStorage(Location? location = null, bool hasImage = false)
        {
            _location = location;
            _hasImage = hasImage;
        }

        public void EnsureFolder(string locationsPath) { }

        public Task<IReadOnlyList<Location>> GetAllAsync(string locationsPath, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Location>>(_location is null ? [] : [_location]);

        public Task<Location> CreateAsync(string locationsPath, string name, CancellationToken ct = default) =>
            Task.FromResult(new Location { Id = Guid.NewGuid(), Name = name });

        public Task<Location?> GetAsync(string locationsPath, Guid id, CancellationToken ct = default) =>
            Task.FromResult(_location?.Id == id ? _location : null);

        public Task SaveAsync(string locationsPath, Location location, CancellationToken ct = default)
        {
            SaveCalls++;
            return Task.CompletedTask;
        }

        public Task DeleteAsync(string locationsPath, Guid id, CancellationToken ct = default)
        {
            DeleteCalls++;
            return Task.CompletedTask;
        }

        public Task SaveImageAsync(string locationsPath, Guid id, Stream imageStream, string extension, CancellationToken ct = default)
        {
            SaveImageCalls++;
            return Task.CompletedTask;
        }

        public Task<(Stream Stream, string ContentType)?> GetImageAsync(string locationsPath, Guid id, CancellationToken ct = default)
        {
            if (!_hasImage) return Task.FromResult<(Stream, string)?>(null);
            return Task.FromResult<(Stream, string)?>((new MemoryStream([0x89]), "image/jpeg"));
        }

        public void DeleteImage(string locationsPath, Guid id) => DeleteImageCalls++;
    }
}
