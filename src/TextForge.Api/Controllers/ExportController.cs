using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Export.Interfaces;
using TextForge.Export.Models;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/export")]
public sealed class ExportController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;
    private readonly IExportService _export;
    private readonly IShellDialogService _dialogs;
    private readonly ILogger<ExportController> _log;

    public ExportController(
        ISeriesWorkspaceService workspace,
        IExportService export,
        IShellDialogService dialogs,
        ILogger<ExportController> log)
    {
        _workspace = workspace;
        _export = export;
        _dialogs = dialogs;
        _log = log;
    }

    [HttpPost]
    public async Task<IActionResult> Export([FromBody] ExportRequest request, CancellationToken ct)
    {
        var series = _workspace.GetCurrentSeries();
        if (series is null)
            return BadRequest(new ErrorDto("No series is open."));

        var format = request.Format.Equals("epub", StringComparison.OrdinalIgnoreCase)
            ? ExportFormat.Epub
            : ExportFormat.Pdf;

        var (dialogTitle, filter, ext) = format == ExportFormat.Epub
            ? ("Save EPUB", "EPUB Files (*.epub)|*.epub", "epub")
            : ("Save PDF", "PDF Files (*.pdf)|*.pdf", "pdf");

        var safeName = string.IsNullOrWhiteSpace(request.Title)
            ? series.Title
            : request.Title;
        var defaultFileName = string.Concat(
            safeName.Where(c => !Path.GetInvalidFileNameChars().Contains(c)));
        defaultFileName = $"{defaultFileName}.{ext}";

        var outputPath = await _dialogs.ShowSaveFileDialogAsync(dialogTitle, filter, defaultFileName);
        if (outputPath is null)
            return Ok(new ExportResultDto(null, Cancelled: true));

        var options = new ExportOptions(
            Title: string.IsNullOrWhiteSpace(request.Title) ? series.Title : request.Title,
            Author: request.Author ?? string.Empty,
            Format: format,
            BookIds: request.BookIds?.Select(Guid.Parse).ToList());

        try
        {
            await _export.ExportAsync(series, options, outputPath, ct);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Export failed — format={Format} path={Path}", format, outputPath);
            // Clean up the partially-written output file if it exists.
            if (System.IO.File.Exists(outputPath))
            {
                try { System.IO.File.Delete(outputPath); }
                catch { /* best effort */ }
            }
            return StatusCode(500, new ErrorDto($"Export failed: {ex.Message}"));
        }

        return Ok(new ExportResultDto(outputPath, Cancelled: false));
    }
}
