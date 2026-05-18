using Microsoft.Extensions.Logging;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;
using TextForge.Core.Requests;

namespace TextForge.Storage.Services;

public sealed class BookStorageService : IBookStorageService
{
    private readonly ILogger<BookStorageService> _logger;

    public BookStorageService(ILogger<BookStorageService> logger)
    {
        _logger = logger;
    }

    public Task<BookProject> CreateBookAsync(CreateBookRequest request, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<BookProject> OpenBookAsync(string bookFilePath, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task SaveBookAsync(BookProject book, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task<Scene?> GetSceneAsync(Guid sceneId, CancellationToken ct = default)
        => throw new NotImplementedException();

    public Task SaveSceneContentAsync(Guid sceneId, string content, CancellationToken ct = default)
        => throw new NotImplementedException();
}
