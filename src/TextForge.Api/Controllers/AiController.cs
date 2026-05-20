using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/ai")]
public sealed class AiController : ControllerBase
{
    private readonly IAppSettingsService _settings;
    private static readonly HttpClient Http = new();
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public AiController(IAppSettingsService settings) => _settings = settings;

    [HttpGet("config")]
    public async Task<IActionResult> GetConfig(CancellationToken ct)
    {
        var config = await _settings.GetAiConfigAsync(ct);
        if (config is null)
            return NoContent();
        return Ok(new AiConfigDto(config.BaseUrl, MaskKey(config.ApiKey), config.Model));
    }

    [HttpPut("config")]
    public async Task<IActionResult> SetConfig([FromBody] AiConfigDto dto, CancellationToken ct)
    {
        var existing = await _settings.GetAiConfigAsync(ct);
        var apiKey = dto.ApiKey == MaskedPlaceholder && existing is not null
            ? existing.ApiKey
            : dto.ApiKey;
        await _settings.SetAiConfigAsync(new AiConfig(dto.BaseUrl.TrimEnd('/'), apiKey, dto.Model), ct);
        return NoContent();
    }

    [HttpPost("complete")]
    public async Task Complete([FromBody] AiCompleteRequest request, CancellationToken ct)
    {
        var config = await _settings.GetAiConfigAsync(ct);
        if (config is null)
        {
            Response.StatusCode = 400;
            await Response.WriteAsync("AI is not configured. Open Settings → AI to add your provider.", ct);
            return;
        }

        var messages = new List<object>();
        if (!string.IsNullOrWhiteSpace(request.SystemPrompt))
            messages.Add(new { role = "system", content = request.SystemPrompt });
        messages.Add(new { role = "user", content = request.Prompt });

        var body = JsonSerializer.Serialize(new
        {
            model = config.Model,
            messages,
            stream = true,
            temperature = request.Temperature,
            max_tokens = request.MaxTokens,
        }, JsonOpts);

        using var req = new HttpRequestMessage(HttpMethod.Post, $"{config.BaseUrl}/v1/chat/completions");
        req.Content = new StringContent(body, Encoding.UTF8, "application/json");
        if (!string.IsNullOrWhiteSpace(config.ApiKey))
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.ApiKey);

        Response.ContentType = "text/plain; charset=utf-8";
        Response.Headers["X-Accel-Buffering"] = "no";

        using var resp = await Http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!resp.IsSuccessStatusCode)
        {
            Response.StatusCode = (int)resp.StatusCode;
            await Response.WriteAsync(await resp.Content.ReadAsStringAsync(ct), ct);
            return;
        }

        await using var stream = await resp.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);
        string? line;
        while (!ct.IsCancellationRequested && (line = await reader.ReadLineAsync(ct)) is not null)
        {
            if (!line.StartsWith("data: ")) continue;

            var data = line[6..];
            if (data == "[DONE]") break;

            try
            {
                using var doc = JsonDocument.Parse(data);
                var content = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("delta")
                    .TryGetProperty("content", out var c) ? c.GetString() : null;
                if (content is not null)
                    await Response.WriteAsync(content, ct);
            }
            catch (JsonException) { /* malformed SSE chunk — skip */ }
        }
    }

    private const string MaskedPlaceholder = "••••••••";
    private static string MaskKey(string key) =>
        string.IsNullOrEmpty(key) ? string.Empty : MaskedPlaceholder;
}
