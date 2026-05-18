# TextForge Studio — Implementation Plan

**Version 1.0 · May 2026**

---

## Overview

This document describes the phased implementation strategy for TextForge Studio. The approach follows the build order defined in the design document: build the stable foundation before any UI, prove each layer with tests before layering the next, and ship a working MVP before expanding scope.

The MVP acceptance bar is narrow and deliberate: **Create book → add chapters → add scenes → edit content → save → reload.** Nothing else ships until this loop is airtight.

---

## Architecture Summary

| Concern | Decision | Rationale |
|---|---|---|
| Desktop shell | WPF + WebView2 | Native OS access without Electron overhead |
| UI framework | React (TypeScript) via Vite | Full modern JS ecosystem, hot reload in dev |
| API layer | ASP.NET Core (Kestrel in-process) | Standard REST, no CORS, same process as WPF |
| Storage | Filesystem-first (Markdown + JSON) | Human-readable, Git-friendly, no DB lock-in |
| Domain | Pure C# / .NET 10, no framework deps | Testable, portable, stable foundation |

The WPF process owns the application lifetime. Kestrel starts inside it. WebView2 navigates to `http://localhost:{port}`. The React app communicates exclusively via `fetch /api/*` — no WebView2 message channels, no shared memory, no exceptions.

---

## Phase 1 — Solution Foundation

**Goal:** Compilable solution with correct project references, shared infrastructure, and CI-ready structure.

### What gets built
- `TextForge.sln` with all six projects scaffolded
- Project references wired per the dependency graph (Core ← Storage ← Api ← Desktop; Core ← Versioning; Core ← Export)
- `.editorconfig` and analyzer rules (nullable enabled, treat warnings as errors in Core and Storage)
- NuGet packages added per project (no version drift via `Directory.Build.props`)
- GitHub Actions (or equivalent) CI: build + test on push
- `ui/textforge-ui/` scaffolded with Vite + React + TypeScript

### Dependency rules enforced from day one
- `TextForge.Core` — zero external NuGet dependencies; references only the BCL
- `TextForge.Storage` — references Core only; no ASP.NET, no WPF
- `TextForge.Api` — references Core and Storage; no WPF
- `TextForge.Desktop` — references Api; owns WPF and WebView2 packages
- Test projects — reference only their target and test infrastructure (xUnit, FluentAssertions, etc.)

---

## Phase 2 — Domain Models

**Goal:** Stable, serialization-ready domain types in `TextForge.Core` with no external dependencies.

### What gets built
- `BookProject`, `Chapter`, `Scene` model classes (immutable init properties where appropriate)
- Domain enums and value objects (e.g. `DirtyState`, `SortOrder` logic)
- `IBookStorageService` interface — defines the contract Storage must implement
- Manifest versioning types: `BookManifest`, `ChapterManifest`, `SceneManifest` (JSON-safe, versioned)
- Validation primitives: title length, safe path character rules
- XML doc comments on all public interfaces (this is the architectural boundary; document it)

### Key design decisions
- GUIDs as stable identifiers; display names and file paths are mutable
- `SortOrder` is an integer on the manifest, not derived from folder or file name order
- `Content` is not stored in the manifest — scene files are the source of truth for content
- Manifest `version` field is present from day one to support future migrations

---

## Phase 3 — Storage Service

**Goal:** Full filesystem read/write capability with safe-write patterns and comprehensive test coverage.

### What gets built
- `BookStorageService` implementing `IBookStorageService`
- `CreateBookAsync` — generates folder structure, writes `book.tfbook` manifest, creates `manuscript/` subdirectory
- `OpenBookAsync` — reads and deserializes manifest, discovers chapter folders, loads scene metadata (not content)
- `SaveBookAsync` — safe-write to manifest (write temp → flush → replace → delete temp), saves all dirty scene `.md` files
- `GetSceneAsync` / `SaveSceneContentAsync` — lazy content loading by scene GUID
- Path generation utilities: slug from title (e.g. `chapter-001-the-storm`), collision avoidance, reserved character stripping
- Structured error types: `ManifestNotFoundException`, `InvalidManifestException`, `SceneFileNotFoundException`

### Safe-write pattern (mandatory for all manifest writes)
```
1. Serialize to string
2. Write to {path}.tmp
3. Flush and close
4. File.Replace({path}.tmp → {path}, backup: {path}.bak)
5. Delete {path}.bak on success
```
This prevents manifest corruption on crash or power loss.

### Storage tests (written before moving to Phase 4)
- Create book produces correct folder structure
- Manifest round-trips through serialize/deserialize without data loss
- Chapter and scene ordering is preserved across save/load cycles
- Re-opening a saved project restores all titles, GUIDs, and sort orders
- Missing manifest returns `ManifestNotFoundException` (not a raw exception)
- Invalid JSON returns `InvalidManifestException`
- Missing scene file returns `SceneFileNotFoundException`
- Safe-write: simulated crash mid-write leaves original manifest intact
- Path generation: special characters are stripped, length is capped, slugs are unique within a book

**Do not advance to Phase 4 until all storage tests pass.**

---

## Phase 4 — WPF Shell

**Goal:** A running WPF window with Kestrel bootstrapped in-process and WebView2 navigating to the correct URL.

### What gets built
- `App.xaml.cs` — `OnStartup` finds a free port, builds and starts the Kestrel host, creates `MainWindow`
- `MainWindow.xaml` — single `WebView2` control filling the window; no WPF UI widgets
- `MainWindow.xaml.cs` — `EnsureCoreWebView2Async`, configure settings (no context menu in release, dev tools in debug), navigate to correct URL
- Compile constant `#if DEBUG` routing: dev → Vite (`localhost:5173`), release → Kestrel (`localhost:{port}`)
- `OnExit` — graceful `_api.StopAsync()` before the WPF window closes
- Port selection utility — `TcpListener(IPAddress.Loopback, 0)` pattern; no hardcoded ports in production

### What is explicitly NOT built here
- No WPF data binding, no WPF controls beyond the shell
- No custom WPF window chrome (deferred; use default OS chrome for MVP)
- No system tray (post-MVP)

---

## Phase 5 — React Scaffold

**Goal:** A buildable React+TypeScript frontend with Vite, proxy to Kestrel, and output path configured.

### What gets built
- `ui/textforge-ui/` — Vite 5 + React 18 + TypeScript strict mode
- Vite proxy: `/api/*` → `http://localhost:5000` (Kestrel dev port)
- `npm run build` output path set to `../../src/TextForge.Desktop/wwwroot/`
- Base API client module (`src/api/client.ts`) — typed `fetch` wrapper with error extraction
- Placeholder `App.tsx` — renders "TextForge is running" with the API port; confirms the stack is wired end-to-end
- ESLint + Prettier configuration matching project conventions

### Verification milestone
Open the application in debug mode. The WPF window should display the Vite dev page. Calling `GET /api/health` from the browser console should return 200. The Vite proxy should forward the request to Kestrel successfully.

---

## Phase 6 — API Controllers

**Goal:** REST endpoints for the full manuscript workflow, wired to storage services.

### Endpoints
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/books` | Create new book (triggers `CreateBookAsync`) |
| `GET` | `/api/books/{id}` | Load book structure (chapters + scene metadata, no content) |
| `POST` | `/api/books/open` | Open existing book by file path |
| `POST` | `/api/books/{id}/chapters` | Add chapter |
| `PUT` | `/api/books/{id}/chapters/{chapterId}` | Rename / reorder chapter |
| `DELETE` | `/api/books/{id}/chapters/{chapterId}` | Delete chapter |
| `POST` | `/api/books/{id}/chapters/{chapterId}/scenes` | Add scene |
| `GET` | `/api/scenes/{id}` | Get scene content |
| `PUT` | `/api/scenes/{id}` | Save scene content |
| `DELETE` | `/api/scenes/{id}` | Delete scene |
| `GET` | `/api/workspace/dirty` | Returns list of unsaved scene IDs |
| `POST` | `/api/shell/folder-dialog` | Triggers WPF `FolderBrowserDialog` |
| `POST` | `/api/shell/open-dialog` | Triggers WPF `OpenFileDialog` |
| `POST` | `/api/shell/save-dialog` | Triggers WPF `SaveFileDialog` |
| `GET` | `/api/health` | Liveness check |

### Service layer
- `BookWorkspaceService` — manages currently-open book state in memory; coordinates between storage and controllers
- `ShellDialogService` — wraps WPF dialog calls behind an interface; injected into the Api project via abstraction (Desktop registers the concrete implementation)
- All controller methods are thin: validate input → call service → return DTO

### DTO conventions
- Request DTOs: `CreateBookRequest`, `AddChapterRequest`, `AddSceneRequest`, `SaveSceneRequest`
- Response DTOs: `BookDto`, `ChapterDto`, `SceneDto` — never expose domain model classes directly
- Errors: `{ "error": "...", "code": "MANIFEST_NOT_FOUND" }` — structured, user-readable

---

## Phase 7 — Book Explorer (React)

**Goal:** A functional left-panel tree showing the open book's hierarchy with context menus.

### What gets built
- `BookExplorer` component — renders chapters and scenes as a collapsible tree
- Context menu on chapters: Rename, Add Scene, Delete
- Context menu on scenes: Rename, Open, Delete
- Double-click on a scene emits an event to open it in an editor tab
- `useBookExplorer` hook — owns API calls for book structure, chapter/scene CRUD, optimistic updates
- "Open Book" flow: triggers `POST /api/shell/folder-dialog`, then `POST /api/books/open`
- "New Book" flow: triggers `POST /api/shell/folder-dialog` for location, then `POST /api/books`
- Empty state: prompt to create or open a book

### State management approach
No global state library for MVP. `useBookExplorer` owns the tree state. The scene editor tab system subscribes via a shared context or prop callbacks. Add a state library only if prop-drilling becomes untenable.

---

## Phase 8 — Scene Editor Tabs

**Goal:** Docked multi-document editor with dirty tracking and save support.

### What gets built
- `SceneEditorArea` — tab container managing open scenes
- `SceneEditorTab` — individual tab with title, dirty indicator (`*`), and close button
- `SceneEditor` — `textarea` (MVP) bound to scene content; `useSceneEditor` hook manages content state and dirty detection
- Duplicate tab prevention — opening an already-open scene focuses its tab
- `Ctrl+S` handler — calls `PUT /api/scenes/{id}` with current content; clears dirty flag on success
- Dirty guard on tab close — prompt "Save changes?" if tab has unsaved changes
- `GET /api/workspace/dirty` polling (or push on WPF exit signal) — WPF queries this before allowing close

### Editor philosophy for MVP
Plain `textarea` only. No rich text, no Markdown preview, no syntax highlighting. These belong post-MVP. The editor must be reliable and not lose content under any circumstance.

---

## Phase 9 — Native Shell Endpoints

**Goal:** File and folder dialogs accessible from React via API calls.

### What gets built
- `ShellController` — thin controller calling `IShellDialogService`
- `WpfShellDialogService` — implements `IShellDialogService` using WPF dialogs; must marshal to the UI thread (`Application.Current.Dispatcher.Invoke`)
- Registered in Desktop's DI setup with the interface registered in Api

---

## Phase 10 — MVP Polish

**Goal:** Error handling, edge cases, keyboard shortcuts, and stability passes before declaring MVP done.

### Checklist
- All API errors return structured JSON (no raw exception messages to the UI)
- Notification/toast area in React for error display
- Missing manifest on open → user-readable error, not crash
- Invalid scene file → graceful skip with warning, not crash
- All file writes use safe-write pattern (verified by storage tests)
- Keyboard shortcuts: `Ctrl+S` (save), `Ctrl+W` (close tab), `Ctrl+Shift+N` (new scene)
- Window title reflects open book name and dirty state
- Application exit with unsaved changes prompts the user

---

## Post-MVP Roadmap (Not in Scope Now)

| System | Prerequisite |
|---|---|
| Versioning engine (Git-inspired) | MVP complete and stable |
| Export pipeline (PDF/EPUB) | MVP complete and stable |
| Worldbuilding system | Versioning engine complete |
| AI integration | Export pipeline complete |
| Plugin system | All core systems stable |
| Cloud sync | Plugin system architecture defined |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WebView2 not installed on target machine | Medium | High | Bundle Evergreen runtime; detect on startup |
| WPF dispatcher deadlock when API calls back to UI thread (shell dialogs) | Medium | High | Always marshal with `Dispatcher.Invoke`; test on a background thread |
| Manifest corruption on crash during save | Low | High | Safe-write pattern mandatory; tested in storage tests |
| React bundle not found in production (wwwroot empty) | Medium | High | Build step in CI/publish pipeline; fallback error page in Kestrel |
| Port conflict on localhost | Low | Medium | Dynamic port allocation; retry on bind failure |
| Scene GUID collision on large projects | Very Low | Low | Use `Guid.NewGuid()` — collision probability negligible |
