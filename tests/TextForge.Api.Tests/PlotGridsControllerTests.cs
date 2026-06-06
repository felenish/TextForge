using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Controllers;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Core.Models;

namespace TextForge.Api.Tests;

public sealed class PlotGridsControllerTests
{
    [Fact]
    public async Task Put_ReplacesRowsColumnsAndFiltersEmptyCells_ThenSaves()
    {
        var seriesRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var workspace = new FakeWorkspace(new Series { RootPath = seriesRoot, Title = "Series" });
        var storage = new FakePlotGridStorage
        {
            Grid = new PlotGrid
            {
                Id = Guid.NewGuid(),
                Name = "Initial",
                Columns = [new PlotGridColumn { Id = "old-col", Label = "Old" }],
                Rows = [new PlotGridRow { Id = "old-row", Label = "Old" }],
                Cells = [new PlotGridCell { RowId = "old-row", ColId = "old-col", Content = "Old" }],
            },
        };

        var sut = new PlotGridsController(workspace, storage);

        var request = new PutPlotGridBody(
            Name: "Updated Grid",
            Columns:
            [
                new PutPlotGridColumnBody("c2", "Second"),
                new PutPlotGridColumnBody("c1", "First"),
            ],
            Rows:
            [
                new PutPlotGridRowBody("r2", "Row 2"),
                new PutPlotGridRowBody("r1", "Row 1"),
            ],
            Cells:
            [
                new PutPlotGridCellBody("r2", "c2", "A"),
                new PutPlotGridCellBody("r1", "c1", "   "),
                new PutPlotGridCellBody("r2", "c1", null),
                new PutPlotGridCellBody("r1", "c2", "B"),
            ]);

        var result = await sut.Put(storage.Grid.Id, request, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var dto = ok.Value.Should().BeOfType<PlotGridDto>().Subject;

        storage.SaveCalls.Should().Be(1);
        dto.Name.Should().Be("Updated Grid");
        dto.Columns.Select(c => c.Id).Should().ContainInOrder("c2", "c1");
        dto.Rows.Select(r => r.Id).Should().ContainInOrder("r2", "r1");

        // Empty/whitespace cells should be removed.
        dto.Cells.Should().HaveCount(2);
        dto.Cells.Should().Contain(c => c.RowId == "r2" && c.ColId == "c2" && c.Content == "A");
        dto.Cells.Should().Contain(c => c.RowId == "r1" && c.ColId == "c2" && c.Content == "B");
    }

    [Fact]
    public async Task GetAll_WhenNoSeriesOpen_ReturnsBadRequest()
    {
        var workspace = new FakeWorkspace(series: null);
        var storage = new FakePlotGridStorage();
        var sut = new PlotGridsController(workspace, storage);

        var result = await sut.GetAll(CancellationToken.None);

        var bad = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var dto = bad.Value.Should().BeOfType<ErrorDto>().Subject;
        dto.Message.Should().Be("No series is open.");
    }

    private sealed class FakeWorkspace : ISeriesWorkspaceService
    {
        private readonly Series? _series;

        public FakeWorkspace(Series? series) => _series = series;

        public Series? GetCurrentSeries() => _series;

        public Task<Series> CreateSeriesAsync(string title, string parentDirectory, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<Series> OpenSeriesAsync(string seriesFilePath, CancellationToken ct = default) => throw new NotImplementedException();
        public Task<BookProject> AddBookAsync(string title, CancellationToken ct = default) => throw new NotImplementedException();
        public Task RemoveBookAsync(Guid bookId, CancellationToken ct = default) => throw new NotImplementedException();
        public Task SaveSeriesAsync(CancellationToken ct = default) => throw new NotImplementedException();
        public void CloseSeries() => throw new NotImplementedException();
        public BookProject? GetBook(Guid bookId) => throw new NotImplementedException();
        public BookProject? FindBookByScene(Guid sceneId) => throw new NotImplementedException();
        public void TrackDirtyScene(Guid sceneId) => throw new NotImplementedException();
        public void ClearDirtyScene(Guid sceneId) => throw new NotImplementedException();
        public IReadOnlyCollection<Guid> GetDirtySceneIds() => [];
    }

    private sealed class FakePlotGridStorage : IPlotGridStorageService
    {
        public PlotGrid Grid { get; set; } = new() { Id = Guid.NewGuid(), Name = "Grid" };
        public int SaveCalls { get; private set; }

        public void EnsureFolder(string plotGridsPath) { }

        public Task<IReadOnlyList<PlotGrid>> GetAllAsync(string plotGridsPath, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<PlotGrid>>([Grid]);

        public Task<PlotGrid> CreateAsync(string plotGridsPath, string name, CancellationToken ct = default)
            => Task.FromResult(Grid = new PlotGrid { Id = Guid.NewGuid(), Name = name });

        public Task<PlotGrid?> GetAsync(string plotGridsPath, Guid id, CancellationToken ct = default)
            => Task.FromResult(Grid.Id == id ? Grid : null);

        public Task SaveAsync(string plotGridsPath, PlotGrid plotGrid, CancellationToken ct = default)
        {
            SaveCalls++;
            Grid = plotGrid;
            return Task.CompletedTask;
        }

        public Task DeleteAsync(string plotGridsPath, Guid id, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task ReorderAsync(string plotGridsPath, IReadOnlyList<Guid> ids, CancellationToken ct = default)
            => Task.CompletedTask;
    }
}
