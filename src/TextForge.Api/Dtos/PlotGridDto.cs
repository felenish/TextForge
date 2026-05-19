namespace TextForge.Api.Dtos;

public sealed record PlotGridMetaDto(Guid Id, string Name);

public sealed record PlotGridDto(
    Guid Id,
    string Name,
    IReadOnlyList<PlotGridColumnDto> Columns,
    IReadOnlyList<PlotGridRowDto> Rows,
    IReadOnlyList<PlotGridCellDto> Cells
);

public sealed record PlotGridColumnDto(string Id, string Label);
public sealed record PlotGridRowDto(string Id, string Label);
public sealed record PlotGridCellDto(string RowId, string ColId, string? Content);
