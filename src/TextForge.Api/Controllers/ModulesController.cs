using Microsoft.AspNetCore.Mvc;
using TextForge.Api.Dtos;
using TextForge.Api.Interfaces;
using TextForge.Core.Interfaces;
using TextForge.Modules;
using TextForge.Storage.Services;

namespace TextForge.Api.Controllers;

[ApiController]
[Route("api/modules")]
public sealed class ModulesController : ControllerBase
{
    private readonly ISeriesWorkspaceService _workspace;
    private readonly IBookStorageService _bookStorage;
    private readonly ModuleRegistry _registry;
    private readonly ModuleStorageService _moduleStorage;

    public ModulesController(
        ISeriesWorkspaceService workspace,
        IBookStorageService bookStorage,
        ModuleRegistry registry,
        ModuleStorageService moduleStorage)
    {
        _workspace = workspace;
        _bookStorage = bookStorage;
        _registry = registry;
        _moduleStorage = moduleStorage;
    }

    // ── Module list ──────────────────────────────────────────────────────────

    /// <summary>Lists all discovered modules with their enabled state for a specific book.</summary>
    [HttpGet]
    public IActionResult GetAll([FromQuery] Guid bookId)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null)
            return NotFound(new ErrorDto("Book not found."));

        var dtos = _registry.Modules.Select(m => new ModuleDto(
            m.Manifest.Id,
            m.Manifest.Name,
            m.Manifest.Version,
            m.Manifest.Description,
            m.Manifest.Author,
            m.Manifest.BuiltIn,
            m.Manifest.Linkable,
            // Built-ins are always enabled; external modules require explicit opt-in.
            Enabled: m.Manifest.BuiltIn || book.EnabledModules.Contains(m.Manifest.Id)));

        return Ok(dtos);
    }

    // ── Enable / disable ─────────────────────────────────────────────────────

    [HttpPost("{moduleId}/enable")]
    public async Task<IActionResult> Enable(string moduleId, [FromQuery] Guid bookId, CancellationToken ct)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null)
            return NotFound(new ErrorDto("Book not found."));

        var registration = _registry.Get(moduleId);
        if (registration is null)
            return NotFound(new ErrorDto($"Module '{moduleId}' is not installed."));

        if (registration.Manifest.BuiltIn)
            return BadRequest(new ErrorDto("Built-in modules are always enabled and cannot be toggled."));

        if (!IsModuleAccessible(moduleId, book.EnabledModules))
        {
            book.EnabledModules.Add(moduleId);
            _moduleStorage.GetAndEnsureStoragePath(book.RootPath, moduleId);
            await _bookStorage.SaveBookAsync(book, ct);
        }

        return NoContent();
    }

    [HttpPost("{moduleId}/disable")]
    public async Task<IActionResult> Disable(string moduleId, [FromQuery] Guid bookId, CancellationToken ct)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null)
            return NotFound(new ErrorDto("Book not found."));

        var registration = _registry.Get(moduleId);
        if (registration?.Manifest.BuiltIn == true)
            return BadRequest(new ErrorDto("Built-in modules are always enabled and cannot be toggled."));

        if (book.EnabledModules.Remove(moduleId))
            await _bookStorage.SaveBookAsync(book, ct);

        return NoContent();
    }

    // ── Generic storage ──────────────────────────────────────────────────────

    [HttpGet("{moduleId}/storage")]
    public IActionResult ListStorage(string moduleId, [FromQuery] Guid bookId, [FromQuery] string? list)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null) return NotFound(new ErrorDto("Book not found."));
        if (!IsModuleAccessible(moduleId, book.EnabledModules))
            return BadRequest(new ErrorDto($"Module '{moduleId}' is not enabled for this book or not installed."));

        try
        {
            var entries = _moduleStorage.ListDirectory(book.RootPath, moduleId, list ?? string.Empty);
            return Ok(entries);
        }
        catch (UnauthorizedAccessException ex)
        {
            return BadRequest(new ErrorDto(ex.Message));
        }
    }

    [HttpGet("{moduleId}/storage/{**path}")]
    public async Task<IActionResult> ReadStorage(string moduleId, string path, [FromQuery] Guid bookId, CancellationToken ct)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null) return NotFound(new ErrorDto("Book not found."));
        if (!IsModuleAccessible(moduleId, book.EnabledModules))
            return BadRequest(new ErrorDto($"Module '{moduleId}' is not enabled for this book or not installed."));

        try
        {
            var bytes = await _moduleStorage.ReadFileAsync(book.RootPath, moduleId, path, ct);
            var contentType = InferContentType(path);
            return File(bytes, contentType);
        }
        catch (FileNotFoundException)
        {
            return NotFound(new ErrorDto($"Storage file not found: {path}"));
        }
        catch (UnauthorizedAccessException ex)
        {
            return BadRequest(new ErrorDto(ex.Message));
        }
    }

    [HttpPut("{moduleId}/storage/{**path}")]
    public async Task<IActionResult> WriteStorage(string moduleId, string path, [FromQuery] Guid bookId, CancellationToken ct)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null) return NotFound(new ErrorDto("Book not found."));
        if (!IsModuleAccessible(moduleId, book.EnabledModules))
            return BadRequest(new ErrorDto($"Module '{moduleId}' is not enabled for this book or not installed."));

        try
        {
            await _moduleStorage.WriteFileAsync(book.RootPath, moduleId, path, Request.Body, ct);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return BadRequest(new ErrorDto(ex.Message));
        }
    }

    [HttpDelete("{moduleId}/storage/{**path}")]
    public IActionResult DeleteStorage(string moduleId, string path, [FromQuery] Guid bookId)
    {
        var book = _workspace.GetBook(bookId);
        if (book is null) return NotFound(new ErrorDto("Book not found."));
        if (!IsModuleAccessible(moduleId, book.EnabledModules))
            return BadRequest(new ErrorDto($"Module '{moduleId}' is not enabled for this book or not installed."));

        try
        {
            _moduleStorage.DeleteFile(book.RootPath, moduleId, path);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return BadRequest(new ErrorDto(ex.Message));
        }
    }

    // ── Asset serving ────────────────────────────────────────────────────────

    [HttpGet("{moduleId}/asset")]
    public IActionResult GetAsset(string moduleId, [FromQuery] string path)
    {
        var registration = _registry.Get(moduleId);
        if (registration is null)
            return NotFound(new ErrorDto($"Module '{moduleId}' is not installed."));

        var fullPath = Path.GetFullPath(Path.Combine(registration.ModuleDirectory, path));
        if (!fullPath.StartsWith(Path.GetFullPath(registration.ModuleDirectory), StringComparison.OrdinalIgnoreCase))
            return BadRequest(new ErrorDto("Path escapes module directory."));

        if (!System.IO.File.Exists(fullPath))
            return NotFound(new ErrorDto($"Asset not found: {path}"));

        return PhysicalFile(fullPath, InferContentType(path));
    }

    // ── Hyperlink resolution ─────────────────────────────────────────────────

    /// <summary>
    /// Resolves a structured entity reference to display metadata.
    /// Built-in sections are resolved server-side; module entities are surfaced
    /// so the frontend can delegate to the module's resolveLinkable export.
    /// </summary>
    [HttpGet("/api/hyperlinks/resolve")]
    public IActionResult ResolveHyperlink([FromQuery] string target)
    {
        if (string.IsNullOrWhiteSpace(target))
            return BadRequest(new ErrorDto("target is required."));

        var colonIndex = target.IndexOf(':');
        if (colonIndex < 0)
            return BadRequest(new ErrorDto("target must be in the format 'section:entityId'."));

        var section = target[..colonIndex];
        var entityId = target[(colonIndex + 1)..];

        var registration = _registry.Get(section);
        if (registration is not null)
        {
            return Ok(new HyperlinkResolutionDto(
                target,
                section,
                entityId,
                registration.Manifest.Name,
                registration.Manifest.Icon is not null
                    ? $"/api/modules/{section}/asset?path={Uri.EscapeDataString(registration.Manifest.Icon)}"
                    : null,
                RequiresClientResolution: true));
        }

        // Built-in sections resolve client-side via existing stores.
        return Ok(new HyperlinkResolutionDto(
            target,
            section,
            entityId,
            Label: null,
            Icon: null,
            RequiresClientResolution: false));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>
    /// A module is accessible if it is built-in (always on) or explicitly enabled for the book.
    /// </summary>
    private bool IsModuleAccessible(string moduleId, ICollection<string> enabledModules)
    {
        var registration = _registry.Get(moduleId);
        return registration is not null && (registration.Manifest.BuiltIn || enabledModules.Contains(moduleId));
    }

    private static string InferContentType(string path) => Path.GetExtension(path).ToLowerInvariant() switch
    {
        ".json"  => "application/json",
        ".js"    => "application/javascript",
        ".mjs"   => "application/javascript",
        ".svg"   => "image/svg+xml",
        ".png"   => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".webp"  => "image/webp",
        ".css"   => "text/css",
        ".html"  => "text/html",
        ".txt"   => "text/plain",
        _        => "application/octet-stream",
    };
}

public sealed record ModuleDto(
    string Id,
    string Name,
    string Version,
    string? Description,
    string? Author,
    bool BuiltIn,
    bool Linkable,
    bool Enabled);

public sealed record HyperlinkResolutionDto(
    string Target,
    string Section,
    string EntityId,
    string? Label,
    string? Icon,
    bool RequiresClientResolution);
