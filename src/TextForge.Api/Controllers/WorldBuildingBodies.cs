namespace TextForge.Api.Controllers;

public sealed record ReorderWorldItemsBody(IReadOnlyList<string> Ids);
public sealed record WorldFolderDto(string Id, string Name, int SortOrder);
public sealed record SetFolderBody(string? FolderId);
