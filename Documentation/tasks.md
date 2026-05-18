# TextForge Studio — Task List

**Version 1.0 · May 2026**

Tasks are organized by phase. Complete each phase fully before starting the next. Mark tasks `[x]` as they are done.

---

## Phase 1 — Solution Foundation

### 1.1 Solution & Project Scaffolding
- [x] Create `TextForge.sln` at repo root
- [x] Create `src/TextForge.Core/` — class library, target `net10.0`
- [x] Create `src/TextForge.Storage/` — class library, target `net10.0`
- [x] Create `src/TextForge.Versioning/` — class library, target `net10.0` (stub only for now)
- [x] Create `src/TextForge.Export/` — class library, target `net10.0` (stub only for now)
- [x] Create `src/TextForge.Api/` — ASP.NET Core Web API, target `net10.0`
- [x] Create `src/TextForge.Desktop/` — WPF application, target `net10.0-windows`
- [x] Create `tests/TextForge.Core.Tests/` — xUnit, target `net10.0`
- [x] Create `tests/TextForge.Storage.Tests/` — xUnit, target `net10.0`
- [x] Create `tests/TextForge.Versioning.Tests/` — xUnit, target `net10.0` (stub only for now)
- [x] Add all projects to `TextForge.sln`

### 1.2 Project References
- [x] `TextForge.Storage` → references `TextForge.Core`
- [x] `TextForge.Api` → references `TextForge.Core`, `TextForge.Storage`
- [x] `TextForge.Desktop` → references `TextForge.Api`
- [x] `TextForge.Core.Tests` → references `TextForge.Core`
- [x] `TextForge.Storage.Tests` → references `TextForge.Storage`, `TextForge.Core`

### 1.3 Shared Build Configuration
- [x] Create `Directory.Build.props` at repo root — set `<Nullable>enable</Nullable>`, `<ImplicitUsings>enable</ImplicitUsings>`, `<TreatWarningsAsErrors>true</TreatWarningsAsErrors>` for Core and Storage
- [x] Create `Directory.Packages.props` for centralized NuGet version management
- [x] Add `.editorconfig` at repo root with C# and TypeScript formatting rules
- [x] Add `.gitignore` (bin, obj, node_modules, wwwroot/, *.user)

### 1.4 NuGet Packages
- [x] `TextForge.Storage` — no additional packages (BCL only for file IO)
- [x] `TextForge.Api` — `Microsoft.AspNetCore.App` framework reference (implicit via `Sdk.Web`)
- [x] `TextForge.Desktop` — `Microsoft.AspNetCore.App` framework reference, `Microsoft.Web.WebView2`
- [x] `TextForge.Core.Tests` — `xunit`, `xunit.runner.visualstudio`, `FluentAssertions`, `coverlet.collector`
- [x] `TextForge.Storage.Tests` — same as Core.Tests

### 1.5 React Frontend Scaffold
- [x] Run `npm create vite@latest textforge-ui -- --template react-ts` inside `ui/`
- [x] Verify `ui/textforge-ui/` compiles with `npm run build`
- [x] Configure `vite.config.ts` — add proxy: `/api` → `http://localhost:5000`
- [x] Set `build.outDir` in `vite.config.ts` to `../../src/TextForge.Desktop/wwwroot`
- [x] Add `eslint` and `prettier` with project-consistent rules
- [x] Add `ui/textforge-ui/node_modules/` to `.gitignore`

### 1.6 CI
- [x] Create `.github/workflows/ci.yml` (or equivalent) — jobs: `dotnet build`, `dotnet test`, `npm ci && npm run build`
- [x] Verify CI passes on a clean clone

**Phase 1 exit criteria:** `dotnet build TextForge.sln` succeeds. `dotnet test` runs (0 tests pass, 0 fail — stubs are fine). `npm run build` produces output in `wwwroot/`.

---

## Phase 2 — Domain Models

### 2.1 Core Model Classes
- [x] Create `Models/BookProject.cs` in `TextForge.Core`
  - Properties: `Guid Id`, `string Title`, `string RootPath`, `List<Chapter> Chapters`, `DateTimeOffset CreatedUtc`, `DateTimeOffset ModifiedUtc`
  - Use `init` setters where appropriate; `List<Chapter>` initialized in declaration
- [x] Create `Models/Chapter.cs`
  - Properties: `Guid Id`, `string Title`, `int SortOrder`, `List<Scene> Scenes`
- [x] Create `Models/Scene.cs`
  - Properties: `Guid Id`, `string Title`, `string FilePath`, `int SortOrder`, `string Content`
  - `Content` is not persisted in the manifest; it is loaded separately on demand

### 2.2 Manifest Models
- [x] Create `Manifests/BookManifest.cs` — JSON-serializable root manifest
  - Properties: `int Version`, `Guid Id`, `string Title`, `DateTimeOffset CreatedUtc`, `DateTimeOffset ModifiedUtc`, `List<ChapterManifest> Chapters`
- [x] Create `Manifests/ChapterManifest.cs`
  - Properties: `Guid Id`, `string Title`, `string Folder`, `int SortOrder`, `List<SceneManifest> Scenes`
- [x] Create `Manifests/SceneManifest.cs`
  - Properties: `Guid Id`, `string Title`, `string File`, `int SortOrder`
- [x] Set manifest `Version = 1` as a constant; document that future migrations will increment this

### 2.3 Interfaces
- [x] Create `Interfaces/IBookStorageService.cs`
  - `Task<BookProject> CreateBookAsync(CreateBookRequest request, CancellationToken ct = default)`
  - `Task<BookProject> OpenBookAsync(string bookFilePath, CancellationToken ct = default)`
  - `Task SaveBookAsync(BookProject book, CancellationToken ct = default)`
  - `Task<Scene?> GetSceneAsync(Guid sceneId, CancellationToken ct = default)`
  - `Task SaveSceneContentAsync(Guid sceneId, string content, CancellationToken ct = default)`
- [x] Create `Interfaces/IShellDialogService.cs` — interface only; WPF implementation is in Desktop
  - `Task<string?> ShowOpenFileDialogAsync(string title, string filter)`
  - `Task<string?> ShowSaveFileDialogAsync(string title, string filter, string defaultFileName)`
  - `Task<string?> ShowFolderDialogAsync(string title)`

### 2.4 Request Types
- [x] Create `Requests/CreateBookRequest.cs` — `string Title`, `string ParentDirectory` (created in 2.3 as IBookStorageService dependency)
- [x] Create `Requests/AddChapterRequest.cs` — `string Title`
- [x] Create `Requests/AddSceneRequest.cs` — `string Title`

### 2.5 Exception Types
- [x] Create `Exceptions/ManifestNotFoundException.cs`
- [x] Create `Exceptions/InvalidManifestException.cs`
- [x] Create `Exceptions/SceneFileNotFoundException.cs`

### 2.6 Validation
- [x] Create `Validation/TitleValidator.cs` — validates title is not empty, not exceeding 200 chars, not whitespace-only
- [x] Create `Validation/PathSanitizer.cs` — strips reserved filesystem characters; trims; truncates; ensures non-empty result

**Phase 2 exit criteria:** `dotnet build TextForge.Core` produces zero warnings. All types exist with correct namespaces. `IBookStorageService` is the only public dependency surface between Core and Storage.

---

## Phase 3 — Storage Service

### 3.1 BookStorageService Implementation
- [x] Create `Services/BookStorageService.cs` in `TextForge.Storage`, implementing `IBookStorageService`
- [x] Inject `ILogger<BookStorageService>` for structured logging

### 3.2 CreateBookAsync
- [x] Accept `CreateBookRequest`; validate title and parent directory exist
- [x] Generate root folder name from title using `PathSanitizer`
- [x] Create folder structure: `{rootFolder}/manuscript/`, `{rootFolder}/assets/`, `{rootFolder}/.textforge/`
- [x] Create initial `book.tfbook` manifest with one empty chapter list, using safe-write pattern
- [x] Return populated `BookProject` with `RootPath` set to the created folder

### 3.3 OpenBookAsync
- [x] Accept path to `book.tfbook` manifest file
- [x] Read and deserialize manifest; throw `InvalidManifestException` on JSON parse failure
- [x] Throw `ManifestNotFoundException` if file does not exist
- [x] Map `BookManifest` → `BookProject`; map chapters and scenes (content not loaded yet)
- [x] Validate manifest `Version` field; log warning on unknown version

### 3.4 SaveBookAsync
- [x] Serialize updated `BookProject` → `BookManifest`
- [x] Write manifest using safe-write pattern (temp → replace → delete backup)
- [x] Update `ModifiedUtc` on the manifest before writing
- [x] Save any scenes with non-empty `Content` that differ from disk (dirty detection via hash or flag)
- [x] Log each file operation at Debug level

### 3.5 GetSceneAsync
- [x] Look up scene `FilePath` from the in-memory book model
- [x] Read `.md` file content from disk; throw `SceneFileNotFoundException` if missing
- [x] Return `Scene` with `Content` populated

### 3.6 SaveSceneContentAsync
- [ ] Locate scene by GUID
- [ ] Write content to the scene's `.md` file using safe-write pattern
- [ ] Update `ModifiedUtc` on the parent book manifest

### 3.7 Path & Folder Utilities
- [ ] Create `Utilities/FolderPathBuilder.cs` — generates `chapter-001-title-slug` style folder names
- [ ] Ensure collision avoidance: if `chapter-001` exists, try `chapter-001-b` etc.
- [ ] Create `Utilities/SafeFileWriter.cs` — encapsulates the temp-replace-delete write pattern; reusable for both manifests and scene files

### 3.8 Storage Tests (must all pass before Phase 4)
- [ ] `CreateBookAsync_ProducesCorrectFolderStructure` — verify all expected folders and manifest file exist
- [ ] `CreateBookAsync_ManifestContainsCorrectMetadata` — id, title, createdUtc, version=1
- [ ] `OpenBookAsync_ThrowsManifestNotFoundException_WhenFileDoesNotExist`
- [ ] `OpenBookAsync_ThrowsInvalidManifestException_WhenJsonIsCorrupt`
- [ ] `OpenBookAsync_RestoresChaptersAndScenesInSortOrder`
- [ ] `SaveBookAsync_RoundTrips_AllChaptersAndScenes`
- [ ] `SaveBookAsync_PreservesGuidIdentities`
- [ ] `SaveBookAsync_UpdatesModifiedUtc`
- [ ] `SaveBookAsync_SafeWrite_LeavesOriginalIntactOnSimulatedMidWriteCrash`
- [ ] `GetSceneAsync_ThrowsSceneFileNotFoundException_WhenSceneFileMissing`
- [ ] `GetSceneAsync_ReturnsCorrectContent`
- [ ] `SaveSceneContentAsync_PersistsContentToDisk`
- [ ] `PathSanitizer_StripsReservedCharacters`
- [ ] `PathSanitizer_HandlesEmptyAndWhitespaceInput`
- [ ] `FolderPathBuilder_ProducesUniqueNamesWhenCollisionExists`

**Phase 3 exit criteria:** All 15+ storage tests pass. Zero test failures permitted before advancing.

---

## Phase 4 — WPF Shell

### 4.1 App.xaml.cs
- [ ] Implement `GetAvailablePort()` using `TcpListener(IPAddress.Loopback, 0)` pattern
- [ ] Implement `BuildApi(int port)` — creates `WebApplication`, registers services, configures middleware
  - `builder.WebHost.UseUrls($"http://localhost:{port}")`
  - `builder.Services.AddControllers()`
  - `builder.Services.AddSingleton<IBookStorageService, BookStorageService>()`
  - `app.UseDefaultFiles()`, `app.UseStaticFiles()`, `app.MapControllers()`, `app.MapFallbackToFile("index.html")`
- [ ] Implement `OnStartup` — call `GetAvailablePort`, `BuildApi`, `await _api.StartAsync()`, then `new MainWindow(_port).Show()`
- [ ] Implement `OnExit` — `await _api.StopAsync()` before base call
- [ ] Handle `DispatcherUnhandledException` — log and show user-friendly message; do not crash silently

### 4.2 MainWindow.xaml
- [ ] Define single `<wpf:WebView2>` control filling the window (`HorizontalAlignment="Stretch"`, `VerticalAlignment="Stretch"`)
- [ ] Set initial window size (1280 × 800), minimum size (800 × 600)
- [ ] Set `Title` to "TextForge Studio"

### 4.3 MainWindow.xaml.cs
- [ ] Constructor accepts `int port`; stores as `_port`
- [ ] `OnLoaded` — calls `await WebView.EnsureCoreWebView2Async()`
- [ ] Configure `CoreWebView2.Settings.AreDefaultContextMenusEnabled = false`
- [ ] `#if DEBUG` — enable dev tools, navigate to `http://localhost:5173`
- [ ] `#if !DEBUG` — disable dev tools, navigate to `http://localhost:{_port}`
- [ ] Wire `Closing` event — call `GET /api/workspace/dirty`; if dirty scenes exist, show WPF `MessageBox` ("You have unsaved changes. Save before closing?"); cancel close if user declines

### 4.4 Health Check Endpoint
- [ ] Add `HealthController` to `TextForge.Api` — `GET /api/health` returns `{ "status": "ok" }`

**Phase 4 exit criteria:** Application launches without errors. WPF window opens. WebView2 navigates to either Vite or Kestrel static files depending on build configuration. `GET /api/health` returns 200 when called from the browser console inside WebView2.

---

## Phase 5 — React Scaffold

### 5.1 Base API Client
- [ ] Create `src/api/client.ts` — typed `fetch` wrapper; extracts structured error messages; throws on non-2xx
- [ ] Define `ApiError` type: `{ message: string; code?: string }`
- [ ] All API modules import from `client.ts` — no raw `fetch` calls outside this module

### 5.2 API Modules (stubs — implement fully in Phase 6+)
- [ ] Create `src/api/books.ts` — `createBook`, `openBook`, `getBook` function stubs
- [ ] Create `src/api/chapters.ts` — `addChapter`, `updateChapter`, `deleteChapter` stubs
- [ ] Create `src/api/scenes.ts` — `getScene`, `saveScene`, `addScene`, `deleteScene` stubs
- [ ] Create `src/api/workspace.ts` — `getDirtyScenes` stub
- [ ] Create `src/api/shell.ts` — `openFolderDialog`, `openFileDialog` stubs

### 5.3 App Shell
- [ ] Replace Vite default `App.tsx` with a placeholder that calls `GET /api/health` on mount and displays "TextForge is running" + the response
- [ ] Confirm the Vite proxy correctly forwards the request to Kestrel in development

**Phase 5 exit criteria:** `npm run dev` starts. Opening the WPF window in DEBUG shows the Vite dev page. Health check API call succeeds. `npm run build` produces `wwwroot/index.html`.

---

## Phase 6 — API Controllers

### 6.1 BooksController
- [ ] `POST /api/books` — accepts `CreateBookRequest`; calls `IBookWorkspaceService.CreateBookAsync`; returns `BookDto`
- [ ] `GET /api/books/{id}` — returns current open book structure as `BookDto` (chapters + scene metadata, no content)
- [ ] `POST /api/books/open` — accepts `{ "path": "..." }`; calls `OpenBookAsync`; returns `BookDto`

### 6.2 ChaptersController
- [ ] `POST /api/books/{bookId}/chapters` — adds chapter; returns `ChapterDto`
- [ ] `PUT /api/books/{bookId}/chapters/{chapterId}` — renames or reorders chapter; returns `ChapterDto`
- [ ] `DELETE /api/books/{bookId}/chapters/{chapterId}` — removes chapter and its scene files; returns 204

### 6.3 ScenesController
- [ ] `POST /api/books/{bookId}/chapters/{chapterId}/scenes` — adds scene; returns `SceneDto`
- [ ] `GET /api/scenes/{id}` — returns scene with `Content` populated
- [ ] `PUT /api/scenes/{id}` — accepts `SaveSceneRequest { Content }`; saves to disk; returns 204
- [ ] `DELETE /api/scenes/{id}` — removes scene file and manifest entry; returns 204

### 6.4 WorkspaceController
- [ ] `GET /api/workspace/dirty` — returns `{ "dirtySceneIds": ["..."] }` from `IBookWorkspaceService`

### 6.5 ShellController
- [ ] `POST /api/shell/folder-dialog` — calls `IShellDialogService.ShowFolderDialogAsync`; returns `{ "path": "..." }` or 204 if cancelled
- [ ] `POST /api/shell/open-dialog` — calls `ShowOpenFileDialogAsync`; returns path or 204
- [ ] `POST /api/shell/save-dialog` — calls `ShowSaveFileDialogAsync`; returns path or 204

### 6.6 BookWorkspaceService
- [ ] Create `Services/BookWorkspaceService.cs` in `TextForge.Api`
- [ ] Owns the single `BookProject?` currently open in memory (singleton scope)
- [ ] Exposes `OpenBook`, `CreateBook`, `GetCurrentBook`, `TrackDirtyScene`, `ClearDirtyScene`, `GetDirtySceneIds`
- [ ] Delegates file IO to `IBookStorageService`

### 6.7 DTOs
- [ ] Create `Dtos/BookDto.cs` — id, title, rootPath, chapters
- [ ] Create `Dtos/ChapterDto.cs` — id, title, sortOrder, scenes
- [ ] Create `Dtos/SceneDto.cs` — id, title, filePath, sortOrder, content (nullable)
- [ ] Create `Dtos/ErrorDto.cs` — message, code
- [ ] Add global exception handler middleware → returns `ErrorDto` JSON for all unhandled exceptions; never leaks stack traces in production

### 6.8 WpfShellDialogService
- [ ] Create `Services/WpfShellDialogService.cs` in `TextForge.Desktop`
- [ ] Implements `IShellDialogService` from `TextForge.Core`
- [ ] All dialog calls marshalled via `Application.Current.Dispatcher.Invoke`
- [ ] Registered as singleton in `App.xaml.cs` DI setup

**Phase 6 exit criteria:** All API endpoints return correct responses when called with a REST client (curl, Bruno, or browser console). `BookWorkspaceService` correctly tracks dirty state. Shell dialogs open native OS dialogs when called.

---

## Phase 7 — Book Explorer (React)

### 7.1 Layout Shell
- [ ] Create `src/components/layout/AppLayout.tsx` — three-panel layout: left sidebar, main editor area, bottom bar
- [ ] Create `src/components/layout/Sidebar.tsx` — contains `BookExplorer`
- [ ] Wire `AppLayout` into `App.tsx`; remove placeholder health-check content

### 7.2 BookExplorer Component
- [ ] Create `src/components/explorer/BookExplorer.tsx` — root container
- [ ] Create `src/components/explorer/ChapterNode.tsx` — collapsible chapter row with expand/collapse toggle
- [ ] Create `src/components/explorer/SceneNode.tsx` — scene row; double-click triggers open event
- [ ] Empty state: "No book open — create or open a book" with two action buttons

### 7.3 useBookExplorer Hook
- [ ] Create `src/hooks/useBookExplorer.ts`
- [ ] State: `book: BookDto | null`, `loading: boolean`, `error: string | null`
- [ ] Actions: `createBook()`, `openBook()`, `addChapter(title)`, `renameChapter(id, title)`, `deleteChapter(id)`, `addScene(chapterId, title)`, `renameScene(id, title)`, `deleteScene(id)`
- [ ] `createBook` and `openBook` trigger the respective shell dialog APIs first to get the path, then call the book API
- [ ] Optimistic updates for rename operations; revert on error

### 7.4 Context Menus
- [ ] Context menu on chapter node: Rename, Add Scene, Delete
- [ ] Context menu on scene node: Open, Rename, Delete
- [ ] Context menu on empty explorer area: New Book, Open Book
- [ ] Implement a reusable `ContextMenu` component (positioned absolutely, dismisses on outside click)

### 7.5 Scene Open Event
- [ ] Emit `onSceneOpen(sceneId: string, sceneTitle: string)` from `SceneNode` double-click
- [ ] Wire event through `BookExplorer` → `AppLayout` → `SceneEditorArea` (Phase 8)

**Phase 7 exit criteria:** Book explorer displays a tree of chapters and scenes. Context menus work. Opening a book loads and renders the full hierarchy. Adding/removing chapters and scenes updates the tree without a full reload.

---

## Phase 8 — Scene Editor Tabs

### 8.1 Tab Container
- [ ] Create `src/components/editor/SceneEditorArea.tsx` — manages `openTabs: TabState[]` and `activeTabId`
- [ ] Receives `onSceneOpen` events from `BookExplorer` via shared context or prop drilling
- [ ] Prevents duplicate tabs: if scene already open, activate its tab instead of opening a new one
- [ ] Empty state: "Open a scene from the Book Explorer"

### 8.2 Tab Bar
- [ ] Create `src/components/editor/TabBar.tsx` — renders one tab chip per open scene
- [ ] Each tab shows: scene title, dirty indicator (`*` prefix), close button (`×`)
- [ ] Active tab is visually highlighted
- [ ] Close button: if dirty, show `window.confirm("Save changes to '{title}'?")` before closing; if confirmed, save then close; if declined, close without saving; if cancelled, abort close

### 8.3 Scene Editor
- [ ] Create `src/components/editor/SceneEditor.tsx` — renders a `<textarea>` for the active scene
- [ ] On mount: calls `GET /api/scenes/{id}`; populates textarea with `content`
- [ ] On change: marks scene dirty; does NOT auto-save on every keystroke
- [ ] `Ctrl+S` keyboard handler: calls `PUT /api/scenes/{id}`; clears dirty flag on 204 response; shows error toast on failure

### 8.4 useSceneEditor Hook
- [ ] Create `src/hooks/useSceneEditor.ts`
- [ ] State: `content`, `savedContent`, `isDirty`, `saving`, `error`
- [ ] `isDirty = content !== savedContent`
- [ ] `save()` — calls API, updates `savedContent` on success

### 8.5 Dirty State Integration
- [ ] `WorkspaceContext` (or equivalent) tracks which scene IDs are dirty across all open tabs
- [ ] `GET /api/workspace/dirty` is called by the WPF shell on window close (via WebView2 or the exit handler)
- [ ] Alternatively: WPF `Closing` event calls `GET /api/workspace/dirty` synchronously via `HttpClient`

### 8.6 Window Title
- [ ] Update `document.title` (or post a message to WPF) to reflect current book name and dirty state
- [ ] Format: `"My Novel — TextForge Studio"` or `"My Novel* — TextForge Studio"` when dirty

**Phase 8 exit criteria:** Scenes open in tabs. Multiple scenes can be open simultaneously. Editing marks the tab dirty. `Ctrl+S` saves and clears the dirty indicator. Closing a dirty tab prompts the user. Re-opening the app after save restores all content correctly.

---

## Phase 9 — Native Shell Endpoints

### 9.1 Wire Up Dialog Service
- [ ] Register `IShellDialogService` → `WpfShellDialogService` as singleton in `App.xaml.cs`
- [ ] Ensure `ShellController` in `TextForge.Api` correctly receives the interface via DI

### 9.2 Test Dialog Flows
- [ ] "New Book" flow: folder dialog → create book → explorer updates
- [ ] "Open Book" flow: file open dialog filtered to `*.tfbook` → open book → explorer updates
- [ ] Verify dialog cancellation (user hits Cancel) returns 204 and the UI handles it gracefully (no error state)

---

## Phase 10 — MVP Polish

### 10.1 Error Handling
- [ ] Global error boundary in React — catches render errors; shows "Something went wrong" with reload button
- [ ] `client.ts` — all non-2xx responses extract `ErrorDto.message` and throw `ApiError`
- [ ] Toast/notification component — displays `ApiError.message` for 4–8 seconds; dismissible
- [ ] Kestrel exception middleware — catch all unhandled exceptions; return `ErrorDto`; log internally; never leak stack trace in production

### 10.2 Keyboard Shortcuts
- [ ] `Ctrl+S` — save active scene (already wired in Phase 8; verify works globally, not just when textarea is focused)
- [ ] `Ctrl+W` — close active tab (with dirty-state guard)
- [ ] `Ctrl+Shift+N` — add new scene to the selected chapter in explorer (or prompt to select a chapter)
- [ ] `Escape` — dismiss open context menus

### 10.3 Safe-Write Verification
- [ ] Confirm `SafeFileWriter` is used for all manifest writes (grep for `File.WriteAllText` — there should be none outside SafeFileWriter)
- [ ] Confirm scene content writes also use `SafeFileWriter`

### 10.4 Application Exit Guard
- [ ] WPF `Closing` event: call `GET /api/workspace/dirty` synchronously
- [ ] If any dirty scene IDs returned: show `MessageBox.Show("You have unsaved changes. Exit anyway?", buttons: YesNo)`
- [ ] If user chooses No: set `e.Cancel = true`
- [ ] If user chooses Yes: allow exit (changes are lost — this is intentional)

### 10.5 Final MVP Acceptance Test
Run through the full acceptance criteria from the design document manually:
- [ ] Create a new book — correct folder structure appears on disk
- [ ] Add two chapters via Book Explorer context menu
- [ ] Add two scenes per chapter
- [ ] Open each scene in an editor tab; type content
- [ ] Save with `Ctrl+S` — dirty indicator clears
- [ ] Close the application
- [ ] Reopen the project — all chapters, scenes, ordering, titles, and content are restored exactly
- [ ] Verify `book.tfbook` is valid JSON and human-readable

**MVP is complete when all acceptance test steps pass without errors.**

---

## Deferred — Post-MVP

These tasks are captured for future planning but must not be started until the MVP acceptance test is fully passing.

- [ ] **Versioning engine** — commit, branch, restore-point system (see design doc §11.1)
- [ ] **Export pipeline** — PDF and EPUB output (see design doc §11.2)
- [ ] **Worldbuilding system** — Characters, Locations, Notes panels (see design doc §11.3)
- [ ] **AI integration** — rewrite suggestions, consistency checks (see design doc §11.4)
- [ ] **Rich text editor** — replace MVP `textarea` with a Markdown-aware editor
- [ ] **Custom window chrome** — remove default OS title bar; implement custom WPF chrome
- [ ] **System tray** — minimize to tray, global hotkey to restore
- [ ] **Plugin system** — extensibility API for third-party integrations
- [ ] **Cloud sync** — optional; must be additive and not change core local-first behavior
