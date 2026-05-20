namespace TextForge.Api.Dtos;

public sealed record AiConfigDto(string BaseUrl, string ApiKey, string Model);

public sealed record AiCompleteRequest(
    string Prompt,
    string? SystemPrompt = null,
    double Temperature = 0.7,
    int MaxTokens = 2048);
