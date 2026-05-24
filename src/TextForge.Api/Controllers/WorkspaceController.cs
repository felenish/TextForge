using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/workspace")]
public sealed class WorkspaceController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;

    public WorkspaceController(ISeriesWorkspaceService workspace) => _workspace = workspace;

    [HttpGet("version")]
    public IActionResult GetVersion()
    {
        var v = typeof(WorkspaceController).Assembly.GetName().Version;
        var label = v is null ? "unknown" : $"v{v.Major}.{v.Minor}.{v.Build}";
        return Ok(new { version = label });
    }

    [HttpGet("dirty")]
    public IActionResult GetDirtyScenes()
    {
        var ids = _workspace.GetDirtySceneIds().Select(id => id.ToString()).ToArray();
        return Ok(ids);
    }

    [HttpPost("dirty/{sceneId:guid}")]
    public IActionResult MarkDirty(Guid sceneId)
    {
        _workspace.TrackDirtyScene(sceneId);
        return NoContent();
    }
}
