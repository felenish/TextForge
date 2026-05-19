namespace TextForge.Core.Requests;

public sealed class CreateSeriesRequest
{
    public required string Title { get; init; }
    public required string ParentDirectory { get; init; }
}
