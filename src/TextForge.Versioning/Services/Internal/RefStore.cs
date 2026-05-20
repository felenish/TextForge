using TextForge.Core.Utilities;

namespace TextForge.Versioning.Services.Internal;

internal sealed class RefStore
{
    private const string SymbolicRefPrefix = "ref: refs/branches/";

    public async Task<string> ReadHeadAsync(string seriesRoot, CancellationToken ct)
    {
        var path = HeadPath(seriesRoot);
        if (!File.Exists(path))
            return "main";

        var raw = (await File.ReadAllTextAsync(path, ct)).Trim();
        return raw.StartsWith(SymbolicRefPrefix)
            ? raw[SymbolicRefPrefix.Length..]
            : raw;
    }

    public async Task WriteHeadAsync(string seriesRoot, string value, CancellationToken ct)
    {
        var content = Guid.TryParse(value, out _)
            ? value
            : $"{SymbolicRefPrefix}{value}";
        await SafeFileWriter.WriteAsync(HeadPath(seriesRoot), content, ct);
    }

    public async Task<Guid?> ReadBranchTipAsync(string seriesRoot, string branch, CancellationToken ct)
    {
        var path = BranchPath(seriesRoot, branch);
        if (!File.Exists(path))
            return null;

        var raw = (await File.ReadAllTextAsync(path, ct)).Trim();
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    public async Task WriteBranchTipAsync(string seriesRoot, string branch, Guid snapshotId, CancellationToken ct)
    {
        var path = BranchPath(seriesRoot, branch);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await SafeFileWriter.WriteAsync(path, snapshotId.ToString(), ct);
    }

    public Task<IReadOnlyList<string>> ListBranchesAsync(string seriesRoot, CancellationToken ct)
    {
        var dir = Path.Combine(seriesRoot, ".textforge", "refs", "branches");
        if (!Directory.Exists(dir))
            return Task.FromResult<IReadOnlyList<string>>([]);

        var names = Directory.EnumerateFiles(dir)
            .Select(Path.GetFileName)
            .Where(n => n is not null)
            .Select(n => n!)
            .ToList();

        return Task.FromResult<IReadOnlyList<string>>(names);
    }

    private static string HeadPath(string seriesRoot) =>
        Path.Combine(seriesRoot, ".textforge", "HEAD");

    private static string BranchPath(string seriesRoot, string branch) =>
        Path.Combine(seriesRoot, ".textforge", "refs", "branches", branch);
}
