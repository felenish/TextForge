using System.Text;

namespace TextForge.Storage.Utilities;

public static class SafeFileWriter
{
    /// <summary>
    /// Writes <paramref name="content"/> to <paramref name="destinationPath"/> atomically.
    /// Uses a temp file so a crash mid-write never corrupts the original.
    /// </summary>
    public static async Task WriteAsync(string destinationPath, string content, CancellationToken ct = default)
    {
        var tempPath = destinationPath + ".tmp";
        var backupPath = destinationPath + ".bak";

        await File.WriteAllTextAsync(tempPath, content, Encoding.UTF8, ct);

        if (File.Exists(destinationPath))
        {
            // Atomically swap: temp → destination, old destination → backup
            File.Replace(tempPath, destinationPath, backupPath);

            // Backup is only needed during the Replace call; clean it up immediately
            if (File.Exists(backupPath))
                File.Delete(backupPath);
        }
        else
        {
            // No existing file — move temp into place directly
            File.Move(tempPath, destinationPath);
        }
    }
}
