using System.Text;

namespace TextForge.Core.Utilities;

public static class SafeFileWriter
{
    public static async Task WriteAsync(string destinationPath, string content, CancellationToken ct = default)
    {
        var tempPath = destinationPath + ".tmp";
        var backupPath = destinationPath + ".bak";

        await File.WriteAllTextAsync(tempPath, content, Encoding.UTF8, ct);

        if (File.Exists(destinationPath))
        {
            File.Replace(tempPath, destinationPath, backupPath);

            if (File.Exists(backupPath))
                File.Delete(backupPath);
        }
        else
        {
            File.Move(tempPath, destinationPath);
        }
    }
}
