namespace TextForge.Api.Dtos;

public sealed record ErrorDto(string Message, string? Code = null);
