# TextForge Studio — Design Document

*Architecture • MVP Scope • Technical Reference*

**Version 1.1  •  May 2026**

---

## 1. Project Vision

TextForge Studio is a desktop-first writing IDE for novelists and long-form fiction writers. Conceptually similar to Visual Studio or JetBrains Rider, but focused entirely on creative writing workflows.

### What Writers Can Do

- Organize books into chapters and scenes
- Open multiple scenes simultaneously in docked tabs
- Rearrange manuscript structure visually
- Manage writing assets and worldbuilding content
- Maintain portable, local-first projects
- Experiment safely with alternate story branches
- Export polished manuscripts to PDF and EPUB

### Core Priorities

- Offline-first functionality — no cloud dependency for core features
- Long-term project stability with human-readable storage
- Performance with large novels and hundreds of scenes
- Strong separation of concerns across architectural layers
- Extensibility for source control, AI tools, and plugins

---

## 2. Application Concept

TextForge Studio treats a book like a software solution. Every major object exists as a real file on disk — intentionally different from a monolithic database design. Users can inspect, back up, and recover their work without special tools.

### Project Hierarchy

```
Book Project/
  ├── Manuscript/
  │    ├── Chapter 01/
  │    │    ├── Scene 01.md
  │    │    └── Scene 02.md
  │    └── Chapter 02/
  ├── Characters/
  ├── Locations/
  ├── Notes/
  ├── Timelines/
  ├── Assets/
  └── Version History/
```

---

## 3. Core Design Principles

### 3.1  Local-First

The application must work fully offline. No cloud dependency exists for core functionality. All data belongs to the user and is stored locally. Cloud sync and AI features may be added later, but must be optional.

### 3.2  Portable Projects

A book project must be copyable, backup-friendly, Git-friendly, and human-inspectable. It should remain usable even if the application no longer exists.

### 3.3  File-Based Architecture

Scenes are individual Markdown files. Books are folders. Metadata is stored in JSON manifests. This enables easier versioning, recovery, debugging, and external tooling. SQLite may be introduced for indexing or caching, but the filesystem remains the source of truth.

### 3.4  UI Should Not Own Business Logic

The UI layer remains thin. Business rules belong in Core domain services, Storage services, and API controllers. The React frontend displays state and calls the local API; it does not implement domain logic directly.

### 3.5  Extensibility

The architecture must support future systems — source control, plugins, AI tools, cloud sync, collaboration, rich editors, and custom export pipelines — without requiring rewrites of the MVP foundation.

---

## 4. Technology Stack

| Layer | Technology |
|---|---|
| **Language** | C# / .NET 10 |
| **Desktop Shell** | WPF (`net10.0-windows`) with Microsoft WebView2 |
| **Frontend** | React (TypeScript) — served from `wwwroot` in production, Vite dev server in development |
| **Backend / API** | ASP.NET Core Web API hosted in-process via Kestrel on `localhost` |
| **Architecture** | In-Process Hosting — Kestrel starts inside the WPF process; WebView2 navigates to `http://localhost:{port}` |
| **Serialization** | System.Text.Json — stable, versioned JSON manifests |
| **Storage** | Filesystem-first; SQLite optional for indexing/caching only |

### Why In-Process Hosting

The WPF shell and the ASP.NET Core API run in the same process. There is no hidden console window, no inter-process communication, and no startup sequencing problem. Kestrel starts in ~200 ms, WebView2 navigates to `http://localhost:{port}`, and the React frontend communicates with C# through standard `fetch` calls — same-origin, no CORS required. On application exit, the hosted service shuts down cleanly alongside the WPF window.

This approach provides the full React ecosystem for UI, standard REST API patterns for the backend, a familiar C# debugging experience in Visual Studio, and native WPF access to OS features (file dialogs, system tray, window chrome) without the overhead of Electron or a separate process.

### Development vs Production Mode

| Environment | Frontend served from | WebView2 navigates to |
|---|---|---|
| **Development** | Vite dev server (port 5173) — hot module reload active | `http://localhost:5173` |
| **Production** | Kestrel static files from `wwwroot/` | `http://localhost:{dynamic-port}` |

The desktop project switches targets via a compile constant:

```csharp
#if DEBUG
    WebView.Source = new Uri("http://localhost:5173");
#else
    WebView.Source = new Uri($"http://localhost:{_port}");
#endif
```

---

## 5. Solution Structure

```
TextForge.sln
  ├── src/
  │    ├── TextForge.Core/          ← Pure domain models & interfaces
  │    ├── TextForge.Storage/       ← Filesystem read/write
  │    ├── TextForge.Versioning/    ← Git-inspired local versioning
  │    ├── TextForge.Export/        ← PDF / EPUB pipeline
  │    ├── TextForge.Api/           ← ASP.NET Core controllers, services, DI
  │    └── TextForge.Desktop/       ← WPF shell, hosts Kestrel + WebView2
  ├── ui/
  │    └── textforge-ui/            ← React (TypeScript) frontend; builds to Desktop/wwwroot
  └── tests/
       ├── TextForge.Core.Tests/
       ├── TextForge.Storage.Tests/
       └── TextForge.Versioning.Tests/
```

The React build output (`npm run build`) is written to `src/TextForge.Desktop/wwwroot/` and committed or generated as part of the publish pipeline.

---

## 6. Project Responsibilities

### 6.1  TextForge.Core

Pure domain logic and models. Must not reference WPF, ASP.NET Core, or any UI framework. Contains `BookProject`, `Chapter`, `Scene`, domain enums, interfaces, validation primitives, and shared abstractions.

```csharp
public sealed class BookProject {
    public Guid Id { get; init; }
    public string Title { get; set; } = string.Empty;
    public string RootPath { get; set; } = string.Empty;
    public List<Chapter> Chapters { get; } = new();
    public DateTimeOffset CreatedUtc { get; init; }
    public DateTimeOffset ModifiedUtc { get; set; }
}

public sealed class Chapter {
    public Guid Id { get; init; }
    public string Title { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<Scene> Scenes { get; } = new();
}

public sealed class Scene {
    public Guid Id { get; init; }
    public string Title { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string Content { get; set; } = string.Empty;
}
```

### 6.2  TextForge.Storage

Responsible for reading and writing projects to disk. Handles manifest loading/saving, scene file IO, path generation, JSON serialization, folder creation, and safe write patterns. Must remain UI-independent and have no reference to ASP.NET Core or WPF.

```csharp
public interface IBookStorageService {
    Task<BookProject> CreateBookAsync(CreateBookRequest request, CancellationToken ct = default);
    Task<BookProject> OpenBookAsync(string bookFilePath, CancellationToken ct = default);
    Task SaveBookAsync(BookProject book, CancellationToken ct = default);
}
```

### 6.3  TextForge.Versioning

Future Git-inspired local versioning engine. Handles commits, branches, merges, snapshots, history, and diffs — but prioritizes writer usability over terminal-based workflows. MVP may defer full implementation.

### 6.4  TextForge.Export

Future export pipeline. Handles PDF, EPUB, table of contents, cover images, front matter, chapter ordering, and formatting themes. Export logic must not depend on the UI or ASP.NET Core.

### 6.5  TextForge.Api

ASP.NET Core Web API project. Contains controllers, request/response DTOs, application services, and the DI registration for all Core and Storage services. This project does not start the web host itself — it is referenced by `TextForge.Desktop`, which owns the host lifetime.

```csharp
// Example controller
[ApiController]
[Route("api/[controller]")]
public class ScenesController : ControllerBase
{
    private readonly IBookStorageService _storage;
    public ScenesController(IBookStorageService storage) => _storage = storage;

    [HttpGet("{id}")]
    public async Task<IActionResult> GetScene(Guid id, CancellationToken ct)
    {
        var scene = await _storage.GetSceneAsync(id, ct);
        return scene is null ? NotFound() : Ok(scene);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> SaveScene(Guid id, [FromBody] SaveSceneRequest req, CancellationToken ct)
    {
        await _storage.SaveSceneContentAsync(id, req.Content, ct);
        return NoContent();
    }
}
```

### 6.6  TextForge.Desktop

WPF startup project (`net10.0-windows`). Owns the application entry point, bootstraps Kestrel in-process, creates the main WPF window, and hosts the WebView2 control. Also handles native OS features: file open/save dialogs, window state, system tray (if used), and application lifecycle.

```csharp
// App.xaml.cs
public partial class App : Application
{
    private WebApplication? _api;
    private int _port;

    protected override async void OnStartup(StartupEventArgs e)
    {
        _port = GetAvailablePort();
        _api  = BuildApi(_port);
        await _api.StartAsync();          // Kestrel starts in-process

        base.OnStartup(e);
        new MainWindow(_port).Show();
    }

    private WebApplication BuildApi(int port)
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseUrls($"http://localhost:{port}");
        builder.Services.AddControllers();
        builder.Services.AddSingleton<IBookStorageService, BookStorageService>();
        // ... register all services

        var app = builder.Build();
        app.UseDefaultFiles();
        app.UseStaticFiles();             // serves wwwroot/index.html (React build)
        app.MapControllers();
        app.MapFallbackToFile("index.html"); // React Router support
        return app;
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        if (_api is not null) await _api.StopAsync();
        base.OnExit(e);
    }

    private static int GetAvailablePort()
    {
        var listener = new System.Net.Sockets.TcpListener(
            System.Net.IPAddress.Loopback, 0);
        listener.Start();
        int port = ((System.Net.IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }
}
```

```csharp
// MainWindow.xaml.cs
public partial class MainWindow : Window
{
    private readonly int _port;

    public MainWindow(int port)
    {
        _port = port;
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        await WebView.EnsureCoreWebView2Async();
        WebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
#if !DEBUG
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = false;
        WebView.Source = new Uri($"http://localhost:{_port}");
#else
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = true;
        WebView.Source = new Uri("http://localhost:5173"); // Vite HMR
#endif
    }
}
```

### 6.7  textforge-ui (React Frontend)

TypeScript React application. Communicates exclusively through `fetch` calls to `/api/*`. Because the React app is served from the same origin as the API, no CORS configuration is required. In development, the Vite config proxies `/api` requests to Kestrel.

```typescript
// src/api/scenes.ts
export async function saveScene(id: string, content: string): Promise<void> {
  const res = await fetch(`/api/scenes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}
```

```typescript
// vite.config.ts (development proxy)
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:5000'  // Kestrel port in dev
    }
  }
});
```

---

## 7. Book Project Format

### Folder Structure

```
MyNovel/
  ├── book.tfbook          ← Main manifest (JSON)
  ├── manuscript/
  │    ├── chapter-001/
  │    │    ├── chapter.json
  │    │    ├── scene-001.md
  │    │    └── scene-002.md
  │    └── chapter-002/
  ├── assets/
  └── .textforge/
```

### Manifest Philosophy

The manifest controls ordering and metadata; scenes remain independent files. This enables reordering without moving files, future branching support, easier versioning, and safer recovery.

```json
{
  "version": 1,
  "id": "00000000-0000-0000-0000-000000000000",
  "title": "My Novel",
  "createdUtc": "2026-05-09T00:00:00Z",
  "chapters": [
    {
      "id": "11111111-...",
      "title": "Chapter One",
      "folder": "manuscript/chapter-001",
      "sortOrder": 1,
      "scenes": [
        {
          "id": "22222222-...",
          "title": "Opening Scene",
          "file": "manuscript/chapter-001/scene-001.md",
          "sortOrder": 1
        }
      ]
    }
  ]
}
```

---

## 8. UI Layout & Philosophy

TextForge Studio should feel like a modern IDE — minimal friction, multi-document workflows, fast keyboard-friendly navigation, and stable layouts designed for writers.

The React frontend is responsible for all visual layout. WPF contributes only the native window chrome (title bar, resize handles, OS window management). All UI logic — panels, tabs, editors, context menus — lives in React components.

### Main Layout (MVP)

```
┌─────────────────────────────────────────┐
│  Menu / Toolbar                          │
├───────────────┬─────────────────────────┤
│  Book Explorer │  Main Editor Area       │
│  (left panel)  │  Scene Document Tabs   │
├───────────────┴─────────────────────────┤
│  Status / Output / Notifications         │
└─────────────────────────────────────────┘
```

### Book Explorer

Analogous to Solution Explorer. Displays the hierarchical project tree. MVP interactions:

- Double-click a scene to open it in a docked editor tab
- Right-click a book/chapter/scene for contextual commands
- Right-click > Add Chapter / Add Scene / Rename / Delete

### Document Tabs

Scenes open as closable docked tabs. Requirements: multiple open documents, active document tracking, dirty-state asterisk indicators, prevention of duplicate tabs, and Ctrl+S save support.

### Native OS Integration

Actions that require native OS access are exposed as API endpoints called by the React frontend:

| Feature | API Endpoint | WPF Implementation |
|---|---|---|
| Open file dialog | `POST /api/shell/open-dialog` | `OpenFileDialog` |
| Save file dialog | `POST /api/shell/save-dialog` | `SaveFileDialog` |
| Open folder dialog | `POST /api/shell/folder-dialog` | `FolderBrowserDialog` |
| Reveal in Explorer | `POST /api/shell/reveal` | `Process.Start("explorer.exe")` |

---

## 9. MVP Scope

The MVP focuses exclusively on the manuscript workflow. The goal is a stable foundation before expanding.

| **Included in MVP** | **Excluded from MVP** |
|---|---|
| Book creation & loading | Source control / branching |
| Book Explorer panel | Rich text editing |
| Chapter management | AI features |
| Scene management | Export system (PDF/EPUB) |
| Docked scene editor tabs | Character dossiers |
| Save / load workflow | Notes, locations, timelines |
| File persistence | Collaboration / cloud sync |
| Dirty-state tracking | Plugin system |

### MVP Acceptance Criteria

A user can create a new book and the app produces the correct folder structure. Chapters and scenes can be added through the Book Explorer. Scenes open in docked editor tabs and text can be edited. Saving persists all chapters, scenes, ordering, titles, and content to disk. Closing and reopening the project restores everything exactly.

---

## 10. Key Workflows

### Save Workflow

Save operations must: save dirty scene files, update the manifest, refresh modified timestamps, preserve ordering, and avoid file corruption on failure. Use safe-write patterns (write to temp file, flush, replace, delete temp).

### Dirty State

Dirty state is tracked in the React frontend and mirrored to the API. A scene is dirty when editor content differs from the last-saved version. On application close, the WPF shell queries `/api/workspace/dirty` before allowing exit, and prompts the user if unsaved changes exist.

### File Naming Rules

Scene and chapter titles must not directly become file paths. Use safe, numbered folder names (e.g. `chapter-001-the-storm-arrives`). GUIDs provide stable identity; names and paths may change freely.

### Error Handling

The application must gracefully handle: missing manifests, invalid JSON, missing scene files, unauthorized access, locked files, and failed save operations. API errors return structured JSON with user-readable messages. The React frontend displays these in a notification area; raw exceptions are logged internally.

---

## 11. Future Systems

### 11.1  Versioning Engine

A Git-inspired local versioning system focused on writer usability. No terminal knowledge required.

- Commits, branches, merges, and restore points
- Named snapshots: "Before rewriting Chapter 12"
- Scene-level diff viewer and alternate story branches
- One-click restore of previous scene versions

```
.textforge/
  ├── HEAD
  ├── refs/branches/
  │    ├── main
  │    └── alternate-ending
  └── objects/ (blobs, trees, commits)
```

### 11.2  Export Pipeline

Export wizard guides the user through content selection, ordering, front matter, cover/images, and formatting themes. Outputs: PDF, EPUB. Export operates from the manifest structure and is UI-independent.

### 11.3  Worldbuilding System

Future sections for Characters, Locations, Organizations, Magic Systems, Timelines, Notes, Research, Glossary entries, and Plot threads. Each item follows the same file-based philosophy and can link to scenes.

### 11.4  AI Integration

AI systems assist the writer, never replace them. Must remain optional — the core application works without AI.

- Rewrite suggestions and continuity analysis
- Character consistency checks and plot summaries
- Scene brainstorming and tone analysis
- "What changed since last draft?" summaries

---

## 12. Coding Standards

### General

- Prefer composition over inheritance; avoid god classes
- Keep React components focused; avoid business logic in view components
- Prefer async APIs throughout the C# stack
- Use immutable models where practical
- Keep storage logic out of API controllers and the frontend

### Naming

| | Example |
|---|---|
| ✅ Good (C#) | `BookWorkspaceService`, `ScenesController`, `BookStorageService` |
| ✅ Good (React) | `BookExplorer`, `SceneEditorTab`, `useSceneEditor` |
| ❌ Bad | `BkWrkSvc`, `SEVM`, `BEVM` — abbreviations and Hungarian notation |

### Architectural Layer Responsibilities

| Layer | Responsibilities | Must NOT |
|---|---|---|
| **React Component** | Render UI, handle user input, call API | Implement domain logic, access filesystem |
| **API Controller** | Validate requests, call services, return DTOs | Contain business logic, reference WPF |
| **Application Service** | Orchestrate domain operations, coordinate storage | Depend on ASP.NET Core or WPF types |
| **Storage Service** | File IO, manifest read/write, safe-write patterns | Depend on ASP.NET Core or WPF types |
| **Core / Domain** | Models, interfaces, validation primitives | Reference any framework |
| **WPF Desktop** | Window, WebView2, Kestrel bootstrap, native dialogs | Contain domain or API logic |

---

## 13. Recommended Build Order

This sequence minimizes rewrites by building the foundation before the UI.

| # | Step | Detail |
|---|---|---|
| **1** | **Solution setup** | Create projects, configure analyzers, add CI |
| **2** | **Domain models** | `BookProject`, `Chapter`, `Scene` in `TextForge.Core` |
| **3** | **Manifest models** | JSON schema, versioning, serialization |
| **4** | **Storage service** | Create, open, save, manifest IO, scene file IO |
| **5** | **Storage tests** | Cover all storage operations before building UI |
| **6** | **WPF shell + WebView2** | Main window, Kestrel in-process bootstrap, WebView2 navigation |
| **7** | **React scaffold** | Vite + React + TypeScript, Vite proxy to Kestrel `/api` |
| **8** | **API controllers** | Scenes, chapters, books — wired to storage services |
| **9** | **Book Explorer (React)** | Hierarchical tree component, context menus, API calls |
| **10** | **Scene editor tabs** | Docked documents, dirty-state tracking, Ctrl+S save |
| **11** | **Native shell endpoints** | File/folder dialogs exposed as API endpoints |
| **12** | **MVP polish** | Error handling, safe writes, keyboard shortcuts |

---

## 14. Guidance for GitHub Copilot & Coding Agents

When generating code for this project, follow these rules:

- Keep all domain logic out of React components, controllers, and WPF code
- Keep storage code out of controllers — go through application services
- Prefer interfaces for all application services
- Use async file IO throughout the storage layer
- The React frontend communicates with C# exclusively through `/api/*` fetch calls — no WebView2 message channel hacks
- Preserve the file-based project philosophy — do not introduce a database as the source of truth without an explicit design decision
- Do not implement future systems (versioning, export, AI) before MVP foundations are stable
- Make code testable; avoid static state and service locators
- Use clear, explicit class names — never abbreviate
- When in doubt, favor simple, maintainable, local-first design

> **Remember:** The MVP only needs to prove the manuscript workflow: Create book → add chapters → add scenes → edit content → save → reload. Everything else comes after this foundation is solid.

---

*Confidential — Internal Use Only*
