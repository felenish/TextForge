using TextForge.Core.Models;
using TextForge.Export.Models;

namespace TextForge.Export.Interfaces;

public interface IExportService
{
    Task ExportAsync(Series series, ExportOptions options, string outputPath, CancellationToken ct = default);
}
