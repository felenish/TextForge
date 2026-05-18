namespace TextForge.Core.Requests;

public sealed class CreateBookRequest
{
    public string Title { get; init; } = string.Empty;
    public string ParentDirectory { get; init; } = string.Empty;
}
