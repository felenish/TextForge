namespace TextForge.Core.Models;

public sealed class PlotGrid
{
    public Guid Id { get; init; }
    public string Name { get; set; } = string.Empty;
    public List<PlotGridColumn> Columns { get; set; } = [];
    public List<PlotGridRow> Rows { get; set; } = [];
    public List<PlotGridCell> Cells { get; set; } = [];
    public int SortOrder { get; set; }
}

public sealed class PlotGridColumn
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public sealed class PlotGridRow
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public sealed class PlotGridCell
{
    public string RowId { get; set; } = string.Empty;
    public string ColId { get; set; } = string.Empty;
    public string? Content { get; set; }
}
