using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Controllers;
using TextForge.Core.Interfaces;

namespace TextForge.Api.Tests;

public sealed class WindowControllerTests
{
    [Fact]
    public void Minimize_CallsServiceAndReturnsNoContent()
    {
        var service = new FakeWindowService();
        var sut = new WindowController(service);

        var result = sut.Minimize();

        result.Should().BeOfType<NoContentResult>();
        service.MinimizeCalls.Should().Be(1);
    }

    [Fact]
    public void ToggleMaximize_CallsServiceAndReturnsNoContent()
    {
        var service = new FakeWindowService();
        var sut = new WindowController(service);

        var result = sut.ToggleMaximize();

        result.Should().BeOfType<NoContentResult>();
        service.ToggleMaximizeCalls.Should().Be(1);
    }

    [Fact]
    public void Close_CallsServiceAndReturnsNoContent()
    {
        var service = new FakeWindowService();
        var sut = new WindowController(service);

        var result = sut.Close();

        result.Should().BeOfType<NoContentResult>();
        service.RequestCloseCalls.Should().Be(1);
    }

    [Fact]
    public void EachAction_CallsOnlyItsOwnMethod()
    {
        var service = new FakeWindowService();
        var sut = new WindowController(service);

        sut.Minimize();

        service.MinimizeCalls.Should().Be(1);
        service.ToggleMaximizeCalls.Should().Be(0);
        service.RequestCloseCalls.Should().Be(0);
    }

    private sealed class FakeWindowService : IWindowService
    {
        public int MinimizeCalls { get; private set; }
        public int ToggleMaximizeCalls { get; private set; }
        public int RequestCloseCalls { get; private set; }

        public void Minimize() => MinimizeCalls++;
        public void ToggleMaximize() => ToggleMaximizeCalls++;
        public void RequestClose() => RequestCloseCalls++;
    }
}
