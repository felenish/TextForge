# Changelog

## [v0.1.2] - 2026-06-12

### Features

- **Module System** — Third-party worldbuilding workspaces can now be installed without touching TextForge source code. Modules are discovered at startup from `modules/builtin/`, `modules/external/`, and `%APPDATA%\TextForge\modules\`.
- **Module Manifests** — Each module declares a `module.json` with id, name, version, entry point, storage folder, and linkable flag. Built-in manifests created for Characters, Locations, Outlines, and Plot Grids.
- **`TextForge.Modules` project** — New library providing `ModuleRegistry` (scans directories, validates manifests, rejects path-traversal ids) and `ModuleStorageService` (isolated per-module file I/O with path boundary enforcement).
- **Book Manifest Migration** — Added a versioned migration pipeline (`BookManifestMigrator`, `IBookManifestMigration`) for `book.tfbook`. The v1→v2 migration adds the `modules` key; the original file is backed up before any migration is written.
- **Module REST API** — New `ModulesController` endpoints: list modules with enabled state, enable/disable external modules per book, read/write/delete/list module storage files, serve module assets, and resolve hyperlink targets. Built-in modules are always reported as enabled and cannot be toggled.
- **Hyperlink Resolution API** — `GET /api/hyperlinks/resolve?target={section:entityId}` returns display metadata. External module entities are flagged with `requiresClientResolution: true` for frontend delegation.
- **`ModuleLoader` component** — Dynamically loads UMD or ESM module bundles into a tab. UMD bundles register via `window.__textforge_module_last__`; ESM bundles are loaded with `import()`. A `moduleCache` prevents double-loading across tab switches.
- **Named Board Instances** — Each external module section in the sidebar shows a collapsible list of named boards (e.g. multiple cork boards per book). Boards are created, renamed, and deleted via context menu; each gets a stable `boardId` scoped to its own storage subfolder.
- **`ModuleProps` contract** — Stable public interface injected into every module's `mount()` call: `projectId`, `moduleId`, `boardId`, `boardName`, `apiBase`, `storageBase`, `isActive`, `previousVersion`, `currentVersion`.
- **Settings → Modules panel** — New section in the Settings modal listing all discovered modules with enable/disable toggles (built-ins show "Always on"). Optimistic toggle updates with rollback on error.
- **Settings button wired** — The gear icon in the Activity Bar now opens the Settings modal.
- **Cork Board example module** — Self-contained UMD module (`modules/external/corkboard/`) with draggable sticky notes, 7 card colors, per-card title/body editing, pin graphic, debounced save to `{boardId}/cards.json`, and `resolveLinkable` export. Serves as the canonical reference for module authors.
- **VS Code launch configurations** — Added `.vscode/launch.json` and `tasks.json` with four debug targets: .NET Desktop, Vite Dev Server, Chrome frontend debugger, and .NET test runner; plus a compound "Full Stack" configuration.
- **`puzzle` icon** — Added to the shared `Icon` component for use in module-related UI.

### Fixes

- **`activeBookId` without open scene** — `WorkspaceContext` now falls back to the first book in the series when no scene tab is active, so the Modules settings panel and sidebar module list populate correctly without requiring an open scene.
- **`disableModule` HTTP method** — Corrected frontend API call from `DELETE` to `POST` to match the backend controller.

### Testing

- Added `TextForge.Modules.Tests` project with full coverage of `ModuleRegistry` (discovery, path-traversal rejection, duplicate detection, missing fields) and `BookManifestMigrator` (no-op on current version, v1→v2 migration, idempotency, multi-step chaining).
- Updated `BookStorageServiceTests` and `SeriesStorageServiceTests` to supply the new `BookManifestMigrator` constructor argument.

---

## [v0.1.1] - 2026-06-06

### Features

- **UI Preferences** — Added full preferences management with CRUD functionality; preferences are integrated into the workspace context for persistent user settings.
- **Internal Hyperlinking** — Worldbuilding objects (characters, locations, outlines) can now be hyperlinked to each other via `InternalLinkContext`, enabling navigation between related entries directly from the editor.
- **Worldbuilding Organization** — Implemented sorting and folder management for characters, locations, outlines, and plot grids, enabling structured content organization across worldbuilding modules.
- **Character Custom Sections** — Characters now support user-defined custom sections with full CRUD operations directly in the editor.
- **Location Custom Sections** — Locations now support user-defined custom sections with full CRUD operations directly in the editor.
- **Scene Checklists** — Added checklist items to scenes with full CRUD operations, enabling task and progress tracking within individual scenes.
- **Format Bar Enhancements** — Extended the format bar with text color, highlight color, and text alignment controls; improved styling consistency across editor views.
- **AI Panel Context Menu** — The AI panel output area now shows a loading overlay during generation and exposes a context menu for output actions.
- **Logging Improvements** — Added an "Open Log Folder" action and enhanced logging with performance metrics for easier debugging.

### Fixes

- **Boot Initialization** — Refactored `bootStart` initialization sequence and corrected scene interaction state reset logic to prevent stale state on load.

### Refactoring

- **Save Sequence** — Improved the `saveAll` function in `SceneEditorArea` to execute saves sequentially, preventing race conditions on simultaneous saves.

### Testing

- Added unit tests for various components and hooks to increase coverage.

---

_Changes relative to `main` branch as of 2026-06-06._
