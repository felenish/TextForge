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

public sealed class CharactersControllerTests
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
        var result = await sut.Create(new CreateCharacterBody("Ada", null), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task Patch_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.Patch(Guid.NewGuid(), new PatchCharacterBody(null, null), CancellationToken.None);
        AssertNoSeries(result);
    }

    [Fact]
    public async Task Put_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var sut = MakeSut(series: null);
        var result = await sut.Put(Guid.NewGuid(), new PutCharacterBody("Ada", null, null, null, null, null, []), CancellationToken.None);
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
        var result = await sut.UploadImage(Guid.NewGuid(), MakeFormFile("photo.jpg"), CancellationToken.None);
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
    public async Task GetOne_WhenCharacterNotFound_ReturnsNotFound()
    {
        var storage = new FakeCharacterStorage();
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.GetOne(Guid.NewGuid(), CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>()
            .Which.Value.Should().BeOfType<ErrorDto>()
            .Which.Message.Should().Be("Character not found.");
    }

    [Fact]
    public async Task Patch_WhenCharacterNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.Patch(Guid.NewGuid(), new PatchCharacterBody("New Name", null), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Put_WhenCharacterNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.Put(Guid.NewGuid(), new PutCharacterBody("Ada", null, null, null, null, null, []), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task Delete_WhenSeriesOpen_CallsStorageAndReturnsNoContent()
    {
        var character = MakeCharacter();
        var storage = new FakeCharacterStorage(character);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.Delete(character.Id, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        storage.DeleteCalls.Should().Be(1);
    }

    [Fact]
    public async Task UploadImage_WhenCharacterNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.UploadImage(Guid.NewGuid(), MakeFormFile("photo.jpg"), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task DeleteImage_WhenCharacterNotFound_ReturnsNotFound()
    {
        var sut = MakeSut(series: MakeSeries());
        var result = await sut.DeleteImage(Guid.NewGuid(), CancellationToken.None);
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ── Happy paths ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsAllCharacters()
    {
        var character = MakeCharacter();
        var storage = new FakeCharacterStorage(character);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.GetAll(CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dtos = ok.Value.Should().BeAssignableTo<IEnumerable<CharacterDto>>().Subject;
        dtos.Should().ContainSingle(c => c.Id == character.Id);
    }

    [Fact]
    public async Task Create_ReturnsDtoWithAssignedName()
    {
        var storage = new FakeCharacterStorage();
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.Create(new CreateCharacterBody("Ada Lovelace", "Protagonist"), CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeOfType<CharacterDto>().Which.Name.Should().Be("Ada Lovelace");
    }

    [Fact]
    public async Task Patch_WithNullFields_SkipsUpdate()
    {
        var character = MakeCharacter();
        character.Name = "Original";
        character.Role = "Hero";
        var storage = new FakeCharacterStorage(character);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        await sut.Patch(character.Id, new PatchCharacterBody(Name: null, Role: null), CancellationToken.None);

        character.Name.Should().Be("Original");
        character.Role.Should().Be("Hero");
    }

    [Fact]
    public async Task Patch_WithProvidedFields_UpdatesAndSaves()
    {
        var character = MakeCharacter();
        var storage = new FakeCharacterStorage(character);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.Patch(character.Id, new PatchCharacterBody(Name: "Renamed", Role: null), CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        character.Name.Should().Be("Renamed");
        storage.SaveCalls.Should().Be(1);
    }

    [Fact]
    public async Task Put_FullReplace_CoercesEmptyStringToNull()
    {
        var character = MakeCharacter();
        var storage = new FakeCharacterStorage(character);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        await sut.Put(character.Id,
            new PutCharacterBody("Ada", Role: null, Age: null, Gender: "", Personality: null, Biography: null, CustomSections: []),
            CancellationToken.None);

        // IsNullOrEmpty coerces "" → null but does not strip whitespace
        character.Gender.Should().BeNull();
    }

    [Fact]
    public async Task Put_FullReplace_SetsAllFields()
    {
        var character = MakeCharacter();
        var storage = new FakeCharacterStorage(character);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        await sut.Put(character.Id,
            new PutCharacterBody("Ada", "Protagonist", Age: 30, Gender: "Female", Personality: "Curious", Biography: "Bio text", CustomSections: []),
            CancellationToken.None);

        character.Name.Should().Be("Ada");
        character.Role.Should().Be("Protagonist");
        character.Age.Should().Be(30);
        character.Gender.Should().Be("Female");
        character.Personality.Should().Be("Curious");
        character.Biography.Should().Be("Bio text");
        storage.SaveCalls.Should().Be(1);
    }

    [Fact]
    public async Task UploadImage_InvalidExtension_DefaultsToJpg()
    {
        var character = MakeCharacter();
        var storage = new FakeCharacterStorage(character);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        await sut.UploadImage(character.Id, MakeFormFile("photo.bmp"), CancellationToken.None);

        character.ImageFileName.Should().EndWith(".jpg");
        storage.SaveImageCalls.Should().Be(1);
    }

    [Fact]
    public async Task UploadImage_ValidExtension_PreservesExtension()
    {
        var character = MakeCharacter();
        var storage = new FakeCharacterStorage(character);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        await sut.UploadImage(character.Id, MakeFormFile("photo.png"), CancellationToken.None);

        character.ImageFileName.Should().EndWith(".png");
    }

    [Fact]
    public async Task GetImage_WhenImageExists_ReturnsFile()
    {
        var character = MakeCharacter();
        var storage = new FakeCharacterStorage(character, hasImage: true);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.GetImage(character.Id, CancellationToken.None);

        result.Should().BeOfType<FileStreamResult>();
    }

    [Fact]
    public async Task GetImage_WhenImageMissing_ReturnsNotFound()
    {
        var character = MakeCharacter();
        var storage = new FakeCharacterStorage(character, hasImage: false);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.GetImage(character.Id, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task DeleteImage_ClearsImageFileNameAndSaves()
    {
        var character = MakeCharacter();
        character.ImageFileName = "photo.jpg";
        var storage = new FakeCharacterStorage(character);
        var sut = MakeSut(series: MakeSeries(), storage: storage);

        var result = await sut.DeleteImage(character.Id, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        character.ImageFileName.Should().BeNull();
        storage.DeleteImageCalls.Should().Be(1);
        storage.SaveCalls.Should().Be(1);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static CharactersController MakeSut(Series? series, FakeCharacterStorage? storage = null) =>
        new(new FakeWorkspace(series), storage ?? new FakeCharacterStorage());

    private static Series MakeSeries() => new() { RootPath = Path.GetTempPath(), Title = "Test" };

    private static Character MakeCharacter() => new() { Id = Guid.NewGuid(), Name = "Ada", Role = "Hero" };

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

    private sealed class FakeCharacterStorage : ICharacterStorageService
    {
        private readonly Character? _character;
        private readonly bool _hasImage;

        public int SaveCalls { get; private set; }
        public int SaveImageCalls { get; private set; }
        public int DeleteCalls { get; private set; }
        public int DeleteImageCalls { get; private set; }

        public FakeCharacterStorage(Character? character = null, bool hasImage = false)
        {
            _character = character;
            _hasImage = hasImage;
        }

        public void EnsureFolder(string charactersPath) { }

        public Task<IReadOnlyList<Character>> GetAllAsync(string charactersPath, CancellationToken ct = default) =>
            Task.FromResult<IReadOnlyList<Character>>(_character is null ? [] : [_character]);

        public Task<Character> CreateAsync(string charactersPath, string name, string role, CancellationToken ct = default) =>
            Task.FromResult(new Character { Id = Guid.NewGuid(), Name = name, Role = role });

        public Task<Character?> GetAsync(string charactersPath, Guid id, CancellationToken ct = default) =>
            Task.FromResult(_character?.Id == id ? _character : null);

        public Task SaveAsync(string charactersPath, Character character, CancellationToken ct = default)
        {
            SaveCalls++;
            return Task.CompletedTask;
        }

        public Task DeleteAsync(string charactersPath, Guid id, CancellationToken ct = default)
        {
            DeleteCalls++;
            return Task.CompletedTask;
        }

        public Task SaveImageAsync(string charactersPath, Guid id, Stream imageStream, string extension, CancellationToken ct = default)
        {
            SaveImageCalls++;
            return Task.CompletedTask;
        }

        public Task<(Stream Stream, string ContentType)?> GetImageAsync(string charactersPath, Guid id, CancellationToken ct = default)
        {
            if (!_hasImage) return Task.FromResult<(Stream, string)?>(null);
            return Task.FromResult<(Stream, string)?>((new MemoryStream([0x89]), "image/jpeg"));
        }

        public void DeleteImage(string charactersPath, Guid id) => DeleteImageCalls++;

        public Task ReorderAsync(string charactersPath, IReadOnlyList<Guid> ids, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task<IReadOnlyList<WorldFolder>> GetFoldersAsync(string charactersPath, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<WorldFolder>>([]);

        public Task SaveFoldersAsync(string charactersPath, IReadOnlyList<WorldFolder> folders, CancellationToken ct = default)
            => Task.CompletedTask;
    }
}
