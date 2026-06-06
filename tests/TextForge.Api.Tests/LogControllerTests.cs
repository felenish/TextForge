using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using TextForge.Api.Controllers;

namespace TextForge.Api.Tests;

public sealed class LogControllerTests
{
    [Fact]
    public void Log_WhenPayloadTooLarge_ReturnsBadRequest()
    {
        var logger = new CaptureLogger<LogController>();
        var sut = new LogController(logger);

        var veryLarge = new string('x', 16_001);
        var result = sut.Log(new ClientLogEntry("error", veryLarge, null, null));

        result.Should().BeOfType<BadRequestResult>();
        logger.Entries.Should().BeEmpty();
    }

    [Theory]
    [InlineData("warn", LogLevel.Warning)]
    [InlineData("warning", LogLevel.Warning)]
    [InlineData("error", LogLevel.Error)]
    [InlineData("fatal", LogLevel.Error)]
    [InlineData("info", LogLevel.Information)]
    [InlineData("anything-else", LogLevel.Information)]
    [InlineData(null, LogLevel.Information)]
    public void Log_MapsClientLevelToExpectedServerLogLevel(string? level, LogLevel expected)
    {
        var logger = new CaptureLogger<LogController>();
        var sut = new LogController(logger);

        var result = sut.Log(new ClientLogEntry(level, "msg", "detail", "stack"));

        result.Should().BeOfType<NoContentResult>();
        logger.Entries.Should().ContainSingle();
        logger.Entries[0].Level.Should().Be(expected);
    }

    private sealed class CaptureLogger<T> : ILogger<T>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Entries.Add((logLevel, formatter(state, exception)));
        }
    }
}
