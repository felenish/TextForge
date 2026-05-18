using Microsoft.AspNetCore.Mvc;
using TextForge.Core.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/window")]
public sealed class WindowController : ControllerBase
{
    private readonly IWindowService _window;

    public WindowController(IWindowService window) => _window = window;

    [HttpPost("minimize")]
    public IActionResult Minimize()
    {
        _window.Minimize();
        return NoContent();
    }

    [HttpPost("maximize")]
    public IActionResult ToggleMaximize()
    {
        _window.ToggleMaximize();
        return NoContent();
    }

    [HttpPost("close")]
    public IActionResult Close()
    {
        _window.RequestClose();
        return NoContent();
    }
}
