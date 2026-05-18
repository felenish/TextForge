using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/books")]
public sealed class BooksController : ControllerBase
{
    private readonly IBookWorkspaceService _workspace;

    public BooksController(IBookWorkspaceService workspace) => _workspace = workspace;

    [HttpPost]
    public async Task<IActionResult> CreateBook([FromBody] CreateBookBody request, CancellationToken ct)
    {
        var book = await _workspace.CreateBookAsync(request.Title, request.ParentDirectory, ct);
        return Ok(DtoMapper.ToBookDto(book));
    }

    [HttpGet("{id:guid}")]
    public IActionResult GetBook(Guid id)
    {
        var book = _workspace.GetCurrentBook();
        if (book is null || book.Id != id)
            return NotFound(new ErrorDto("Book not found."));
        return Ok(DtoMapper.ToBookDto(book));
    }

    [HttpPost("open")]
    public async Task<IActionResult> OpenBook([FromBody] OpenBookBody request, CancellationToken ct)
    {
        var book = await _workspace.OpenBookAsync(request.Path, ct);
        return Ok(DtoMapper.ToBookDto(book));
    }
}

public sealed record CreateBookBody(string Title, string ParentDirectory);
public sealed record OpenBookBody(string Path);
