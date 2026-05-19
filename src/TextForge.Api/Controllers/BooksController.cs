using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/books")]
public sealed class BooksController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;
    private readonly IBookStorageService _storage;

    public BooksController(ISeriesWorkspaceService workspace, IBookStorageService storage)
    {
        _workspace = workspace;
        _storage = storage;
    }

    [HttpGet("{id:guid}")]
    public IActionResult GetBook(Guid id)
    {
        var book = _workspace.GetBook(id);
        if (book is null)
            return NotFound(new ErrorDto("Book not found."));
        return Ok(DtoMapper.ToBookDto(book));
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> PatchBook(Guid id, [FromBody] PatchBookBody request, CancellationToken ct)
    {
        var book = _workspace.GetBook(id);
        if (book is null)
            return NotFound(new ErrorDto("Book not found."));

        if (request.Title is not null)
            book.Title = request.Title;

        await _storage.SaveBookAsync(book, ct);
        return Ok(DtoMapper.ToBookDto(book));
    }
}

public sealed record PatchBookBody(string? Title);
