using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/shell")]
public sealed class ShellController : ControllerBase
{
    private readonly IShellDialogService _dialogs;
    private readonly IBookWorkspaceService _workspace;

    public ShellController(IShellDialogService dialogs, IBookWorkspaceService workspace)
    {
        _dialogs = dialogs;
        _workspace = workspace;
    }

    [HttpPost("folder-dialog")]
    public async Task<IActionResult> ShowFolderDialog([FromBody] FolderDialogBody request)
    {
        var path = await _dialogs.ShowFolderDialogAsync(request.Title);
        return path is null ? NoContent() : Ok(new { path });
    }

    [HttpPost("open-dialog")]
    public async Task<IActionResult> ShowOpenDialog([FromBody] OpenDialogBody request)
    {
        var path = await _dialogs.ShowOpenFileDialogAsync(request.Title, request.Filter);
        return path is null ? NoContent() : Ok(new { path });
    }

    [HttpPost("save-dialog")]
    public async Task<IActionResult> ShowSaveDialog([FromBody] SaveDialogBody request)
    {
        var path = await _dialogs.ShowSaveFileDialogAsync(request.Title, request.Filter, request.DefaultFileName);
        return path is null ? NoContent() : Ok(new { path });
    }

    [HttpPost("reveal")]
    public async Task<IActionResult> Reveal([FromBody] RevealBody request)
    {
        var book = _workspace.GetCurrentBook();
        if (book is null) return BadRequest("No book is open.");

        var scene = book.Chapters.SelectMany(c => c.Scenes)
            .FirstOrDefault(s => s.Id == request.SceneId);
        if (scene is null) return NotFound();

        var absolutePath = Path.Combine(book.RootPath,
            scene.FilePath.Replace('/', Path.DirectorySeparatorChar));
        await _dialogs.RevealPathAsync(absolutePath);
        return NoContent();
    }
}

public sealed record FolderDialogBody(string Title);
public sealed record OpenDialogBody(string Title, string Filter);
public sealed record SaveDialogBody(string Title, string Filter, string DefaultFileName);
public sealed record RevealBody(Guid SceneId);
