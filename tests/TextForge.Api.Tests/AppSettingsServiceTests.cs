using System.Text.Json;
using System.Reflection;
using FluentAssertions;
using TextForge.Api.Interfaces;
using TextForge.Api.Services;
using Xunit;

namespace TextForge.Api.Tests;

[Collection("AppSettingsServiceIsolation")]
public sealed class AppSettingsServiceTests : IDisposable
{
    private readonly bool _settingsExisted;
    private readonly string? _settingsBackup;
    private readonly string _settingsPath;

    public AppSettingsServiceTests()
    {
        var settingsPathField = typeof(AppSettingsService)
            .GetField("SettingsPath", BindingFlags.Static | BindingFlags.NonPublic);

        settingsPathField.Should().NotBeNull();
        _settingsPath = settingsPathField!.GetValue(null) as string
            ?? throw new InvalidOperationException("Could not read AppSettingsService.SettingsPath");

        _settingsExisted = File.Exists(_settingsPath);
        _settingsBackup = _settingsExisted ? File.ReadAllText(_settingsPath) : null;

        if (_settingsExisted)
        {
            File.Delete(_settingsPath);
        }
    }

    public void Dispose()
    {
        if (_settingsExisted)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_settingsPath)!);
            File.WriteAllText(_settingsPath, _settingsBackup ?? "{}");
            return;
        }

        if (File.Exists(_settingsPath))
        {
            File.Delete(_settingsPath);
        }

        var dir = Path.GetDirectoryName(_settingsPath);
        if (!string.IsNullOrWhiteSpace(dir) && Directory.Exists(dir) && !Directory.EnumerateFileSystemEntries(dir).Any())
        {
            Directory.Delete(dir, recursive: false);
        }
    }

    [Fact]
    public async Task GetRecentSeriesAsync_WhenSettingsJsonIsMalformed_ReturnsEmptyList()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_settingsPath)!);
        await File.WriteAllTextAsync(_settingsPath, "{ bad json");

        var sut = new AppSettingsService();

        var recent = await sut.GetRecentSeriesAsync(CancellationToken.None);

        recent.Should().BeEmpty();
    }

    [Fact]
    public async Task AddRecentSeriesAsync_DeduplicatesAndCapsToTen()
    {
        var sut = new AppSettingsService();

        for (var i = 0; i < 12; i++)
        {
            await sut.AddRecentSeriesAsync($"Series {i}", $"C:/series-{i}/series.tfseries", CancellationToken.None);
        }

        // Re-add an existing path with updated title; should become first and remain unique.
        await sut.AddRecentSeriesAsync("Series 5 Updated", "C:/series-5/series.tfseries", CancellationToken.None);

        var recent = await sut.GetRecentSeriesAsync(CancellationToken.None);

        recent.Should().HaveCount(10);
        recent[0].Should().Be(new RecentSeriesEntry("Series 5 Updated", "C:/series-5/series.tfseries"));
        recent.Count(r => r.Path.Equals("C:/series-5/series.tfseries", StringComparison.OrdinalIgnoreCase)).Should().Be(1);
    }

    [Fact]
    public async Task SetAiConfigAsync_PersistsAndReturnsConfig()
    {
        var sut = new AppSettingsService();
        var config = new AiConfig("https://localhost:1234", "key-123", "my-model");

        await sut.SetAiConfigAsync(config, CancellationToken.None);
        var restored = await sut.GetAiConfigAsync(CancellationToken.None);

        restored.Should().Be(config);

        // File should exist and be valid JSON payload.
        File.Exists(_settingsPath).Should().BeTrue();
        var json = await File.ReadAllTextAsync(_settingsPath);
        using var doc = JsonDocument.Parse(json);
        var found = doc.RootElement.TryGetProperty("AiConfig", out var aiConfig)
            || doc.RootElement.TryGetProperty("aiConfig", out aiConfig);
        found.Should().BeTrue();
        var hasBaseUrl = aiConfig.TryGetProperty("BaseUrl", out var baseUrl)
            || aiConfig.TryGetProperty("baseUrl", out baseUrl);
        hasBaseUrl.Should().BeTrue();
        baseUrl.GetString().Should().Be("https://localhost:1234");
    }
}

[CollectionDefinition("AppSettingsServiceIsolation", DisableParallelization = true)]
public sealed class AppSettingsServiceIsolationCollection;
