using Microsoft.AspNetCore.Mvc;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class HealthController : ControllerBase
{
    [HttpGet("health")]
    public IActionResult GetHealth() => Ok(new { status = "ok" });
}
