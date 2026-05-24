using Microsoft.AspNetCore.Mvc;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/log")]
public sealed class LogController : ControllerBase
{
    private readonly ILogger<LogController> _log;

    public LogController(ILogger<LogController> log) => _log = log;

    [HttpPost]
    public IActionResult Log([FromBody] ClientLogEntry entry)
    {
        // Validate total payload size to prevent log flooding.
        var total = (entry.Message?.Length ?? 0) + (entry.Detail?.Length ?? 0) + (entry.Stack?.Length ?? 0);
        if (total > 16_000)
            return BadRequest();

        var msg = "[client] {Message}";
        switch (entry.Level?.ToLowerInvariant())
        {
            case "warn":
            case "warning":
                _log.LogWarning(msg, entry.Message);
                break;
            case "error":
            case "fatal":
                _log.LogError("{ClientMessage}\nDetail: {Detail}\nStack: {Stack}",
                    entry.Message, entry.Detail, entry.Stack);
                break;
            default:
                _log.LogInformation(msg, entry.Message);
                break;
        }

        return NoContent();
    }
}

public sealed record ClientLogEntry(string? Level, string? Message, string? Detail, string? Stack);
