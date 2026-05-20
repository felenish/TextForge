using System.Security.Cryptography;
using System.Text;
using TextForge.Core.Utilities;

namespace TextForge.Versioning.Services.Internal;

internal sealed class ObjectStore
{
    public string ComputeHash(string content)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return Convert.ToHexStringLower(bytes);
    }

    public async Task WriteBlobAsync(string seriesRoot, string hash, string content, CancellationToken ct)
    {
        if (BlobExists(seriesRoot, hash))
            return;

        var path = BlobPath(seriesRoot, hash);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await SafeFileWriter.WriteAsync(path, content, ct);
    }

    public async Task<string?> ReadBlobAsync(string seriesRoot, string hash, CancellationToken ct)
    {
        var path = BlobPath(seriesRoot, hash);
        if (!File.Exists(path))
            return null;

        return await File.ReadAllTextAsync(path, Encoding.UTF8, ct);
    }

    public bool BlobExists(string seriesRoot, string hash) =>
        File.Exists(BlobPath(seriesRoot, hash));

    private static string BlobPath(string seriesRoot, string hash) =>
        Path.Combine(seriesRoot, ".textforge", "objects", hash[..2], hash[2..]);
}
