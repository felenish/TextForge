using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/workspace")]
public sealed class WorkspaceController : ControllerBase
{
    private readonly IBookWorkspaceService _workspace;

    public WorkspaceController(IBookWorkspaceService workspace) => _workspace = workspace;

    [HttpGet("dirty")]
    public IActionResult GetDirtyScenes()
    {
        var ids = _workspace.GetDirtySceneIds().Select(id => id.ToString()).ToArray();
        return Ok(ids);
    }
}
