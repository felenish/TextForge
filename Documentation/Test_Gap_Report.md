# TextForge Test Gap Report

Generated: 2026-05-30
Scope: backend (.NET) and frontend (React)
Goal: track test coverage progress and remaining gaps

Status: Updated after implementing Phases 1-4

## 1. Coverage Snapshot

### Existing automated tests

- Storage tests exist in `tests/TextForge.Storage.Tests`:
  - `BookStorageServiceTests.cs`
  - `SeriesStorageServiceTests.cs`
  - `FolderPathBuilderTests.cs`
  - `PathSanitizerTests.cs`
- Versioning tests exist in `tests/TextForge.Versioning.Tests`:
  - `VersioningServiceTests.cs`
- API tests now exist in `tests/TextForge.Api.Tests`:
  - `ScenesControllerTests.cs`
  - `ShellControllerTests.cs`
  - `SeriesWorkspaceServiceTests.cs`
  - `AppSettingsServiceTests.cs`
  - `LogControllerTests.cs`
  - `PlotGridsControllerTests.cs`
  - `ChaptersControllerTests.cs`
  - `SeriesControllerTests.cs`
  - `BooksControllerTests.cs`
  - `CharactersControllerTests.cs`
  - `LocationsControllerTests.cs`
  - `OutlinesControllerTests.cs`
- Core tests now exist in `tests/TextForge.Core.Tests`:
  - `SceneTests.cs`
- React tests now exist in `ui/textforge-ui/tests`:
  - `BottomPanel.test.tsx`
  - `PlotGridEditor.test.tsx`
  - `AppLayout.test.tsx`
  - `WorkspaceContext.test.tsx`
  - `logger.test.ts`
  - `useSeriesExplorer.test.tsx`

### Missing or minimal test areas

- No desktop shell tests exist for `src/TextForge.Desktop`.
- API coverage is improved but still partial across all controllers.
- React coverage is improved but still partial for hooks and integration flows.

### Current validation status

- `npm test` passes (65 tests, updated in Phase 4).
- `npm test` passes (65 tests).
- `dotnet test TextForge.slnx` passes (218 tests).

## 2. Backend Test Gaps (High Value)

## 2.1 API controllers (high priority)

Coverage now exists for several controller paths, but request validation and error paths remain incomplete for some controllers.

Implemented:

1. `src/TextForge.Api/Controllers/ScenesController.cs`
 - Checklist persistence path (`ChecklistItems`) validated.
 - Invalid checklist GUID behavior validated.
 - Not-found path validated.

2. `src/TextForge.Api/Controllers/ShellController.cs`
 - `open-log-folder` behavior validated.
 - Reveal missing scene/book returns 404 validated.

3. `src/TextForge.Api/Controllers/PlotGridsController.cs`
 - Full save replace behavior validated.
 - Row/column order and empty-cell filtering validated.
 - No-series-open bad request path validated.

4. `src/TextForge.Api/Controllers/LogController.cs`
 - Payload size guard (`> 16_000`) validated.
 - Level mapping (`warn`/`warning`/`error`/`fatal`/default) validated.

5. `src/TextForge.Api/Controllers/BooksController.cs`
 - Get book not-found path validated.
 - Patch book not-found path validated.
 - Patch book title update and save validated.
 - Patch with null title skips update (partial semantics) validated.

6. `src/TextForge.Api/Controllers/CharactersController.cs`
 - No-series-open bad request (all write endpoints) validated.
 - Get/Patch/Put/Delete not-found paths validated.
 - Patch partial update (null fields skipped) validated.
 - Put full replace (empty strings coerced to null) validated.
 - Image upload extension defaulting validated.
 - Image get not-found path validated.
 - Delete image clears ImageFileName validated.

7. `src/TextForge.Api/Controllers/LocationsController.cs`
 - No-series-open bad request (all write endpoints) validated.
 - Get/Patch/Put/Delete not-found paths validated.
 - Patch partial update (null name skipped) validated.
 - Put full replace (empty description coerced to null) validated.
 - Image upload extension defaulting validated.
 - Image get not-found path validated.
 - Delete image clears ImageFileName validated.

8. `src/TextForge.Api/Controllers/OutlinesController.cs`
 - No-series-open bad request (all write endpoints) validated.
 - Get/Patch/Put/Delete not-found paths validated.
 - Patch renames only; name unchanged when null validated.
 - Put full save (empty content coerced to null) validated.
 - GetAll returns meta (no content); GetOne returns full DTO validated.

9. `src/TextForge.Api/Controllers/VersionsController.cs`
 - No-series-open bad request (all endpoints) validated.
 - TakeSnapshot: empty/whitespace label returns 400 validated.
 - TakeSnapshot: no scenes returns 400 validated.
 - TakeSnapshot: happy path returns 201 with summary; scene contents gathered validated.
 - GetSnapshots: limit clamped to 100; HasMore pagination logic validated.
 - GetSnapshot: not-found path and diff-to-change-list mapping validated.
 - GetBranches: current-flag propagation validated.
 - CreateBranch: ArgumentException → 400, InvalidOperationException → 409, success → 200 validated.
 - SwitchBranch: not-found path and success validated.
 - GetSceneHistory: hash-change filtering (unchanged snapshots excluded) validated.
 - GetSceneAtSnapshot: not-found and content retrieval validated.
 - RestoreScene: scene-not-in-series → 404, SnapshotNotFoundException → 404, success validated.
 - RestoreSnapshot: not-found and RestoreResultDto mapping validated.

Remaining controller targets:

- `WorkspaceController.cs`
- `WindowController.cs`

## 2.2 API services (high priority)

1. `src/TextForge.Api/Services/SeriesWorkspaceService.cs`
 - Dirty-state tracking and clear/reset behavior validated.
 - Series create/open close paths validated.

2. `src/TextForge.Api/Services/AppSettingsService.cs`
 - Read/write defaults and malformed settings resilience validated.
 - Recents cap/dedupe behavior validated.

## 2.3 Storage regression coverage (medium-high priority)

Implemented:

1. `src/TextForge.Storage/Services/BookStorageService.cs`
 - Scene checklist item manifest round-trip (id/text/done) validated.
 - Checklist order persistence in scene manifests validated.

## 2.4 Desktop startup/logging paths (medium priority)

1. `src/TextForge.Desktop/App.xaml.cs`
- Log directory resolution behavior:
  - LocalAppData path preferred.
  - Temp fallback on directory creation failure.
- Serilog self-log file creation path.

2. `src/TextForge.Desktop/MainWindow.xaml.cs`
- Close flow and save-all handshake timeout behavior.
- Startup cleanup behavior (WebView2 folder delete is intentional).

Status: not yet covered by automated tests.

## 3. React Test Gaps (High Value)

## 3.1 Test infrastructure missing (blocker for frontend tests)

Implemented:

- `vitest`
- `@testing-library/react`
- `@testing-library/user-event`
- `@testing-library/jest-dom`
- `jsdom`

Configured:

- `test` script in `ui/textforge-ui/package.json`
- `vitest` config and setup file
- jsdom test environment

## 3.2 Highest priority component tests

Implemented:

1. `ui/textforge-ui/src/components/panels/BottomPanel.tsx`
 - Checklist load/add/reorder/no-active-scene behaviors validated.

2. `ui/textforge-ui/src/components/editor/PlotGridEditor.tsx`
 - Insert/reorder/delete-confirm behavior validated.
 - Cell mapping integrity validated.

3. `ui/textforge-ui/src/components/layout/AppLayout.tsx`
 - Startup perf logging and app-ready message behavior validated.
 - Auto-open last series path behavior validated.

4. `ui/textforge-ui/src/components/ui/HelpMenu.tsx` + shell API wiring
 - "Open Log Folder" action wiring validated via AppLayout/Menu flow.

## 3.3 Hook/context tests (medium priority)

Implemented:

1. `ui/textforge-ui/src/hooks/useSeriesExplorer.ts`
 - Happy/error/network error flows.
 - Optimistic updates and rollback paths (rename scene/chapter/book).

2. `ui/textforge-ui/src/contexts/WorkspaceContext.tsx`
 - Dirty set operations validated.
 - Theme persistence/cycle behavior validated.
 - `patchSceneMeta` update correctness validated.

3. `ui/textforge-ui/src/lib/logger.ts`
 - Fire-and-forget behavior and error swallow safety validated.

4. `ui/textforge-ui/src/hooks/useSceneEditor.ts`
 - Load on mount, null content defaults to empty string validated.
 - `isDirty` tracks content vs savedContent correctly validated.
 - `onChange` marks dirty; `save` clears dirty and persists validated.
 - Save error sets error state and clears saving flag validated.
 - Load error sets error state and finishes loading validated.
 - Stale load cancellation when sceneId changes mid-flight validated.

5. `ui/textforge-ui/src/hooks/useEditorSettings.ts`
 - Defaults (serif/17/1.7/15) when localStorage empty validated.
 - All four settings read from localStorage on init validated.
 - All four settings persisted to localStorage on change validated.
 - CSS variable injection on mount and on each change validated.

6. `ui/textforge-ui/src/hooks/useWordCountGoal.ts`
 - Goals default to 0; restored from localStorage on init validated.
 - `dailyWritten` restored if stored date is today; reset if yesterday validated.
 - First render does not count initial word count as written validated.
 - Positive deltas accumulate; negative and zero deltas ignored validated.
 - Multiple positive deltas accumulate correctly validated.
 - Progress persisted to localStorage with today's date validated.
 - `resetDailyProgress` zeros state and storage validated.
 - Corrupt progress JSON handled gracefully validated.

## 4. Recommended Test Plan (Phased)

Phase 1 (highest ROI)

- Add frontend test infrastructure.
- Add API tests for `ScenesController` and `ShellController`.
- Add React tests for `BottomPanel` and `PlotGridEditor`.

Status: Complete.

Phase 2

- Add service tests for `SeriesWorkspaceService` and `AppSettingsService`.
- Add regression tests for checklist round-trip in `BookStorageService`.
- Add React tests for `AppLayout` startup logging and help menu command.

Status: Complete.

Phase 3

- Expand coverage for remaining controllers and UI flows.
- Add smoke-level end-to-end checks for startup, logging, and scene checklist persistence.

Status: Complete.
Completed in this phase:
- Added `LogController` and `PlotGridsController` tests.
- Added UI flow tests for `WorkspaceContext` and `logger`.
- Added `useSeriesExplorer` hook tests (happy/error/rollback flows).

Phase 4

- Add controller tests for `BooksController`, `CharactersController`, `LocationsController`, and `OutlinesController`.
- Add hook tests for `useSceneEditor`, `useEditorSettings`, and `useWordCountGoal`.

Status: In progress.
Completed in this phase:
- Added `BooksControllerTests.cs`.
- Added `CharactersControllerTests.cs`.
- Added `LocationsControllerTests.cs`.
- Added `OutlinesControllerTests.cs`.
- Added `VersionsControllerTests.cs` (37 tests covering all 11 endpoints).
- Added `WorkspaceControllerTests.cs` (version string, dirty tracking, idempotency).
- Added `WindowControllerTests.cs` (minimize/maximize/close delegation, method isolation).
- Added `TextForge.Versioning` project reference to `TextForge.Api.Tests`.

Still pending for phase completion:
- Smoke-level end-to-end checks for startup, logging, and scene checklist persistence.

## 5. Immediate Risk Areas if Left Untested

1. Desktop startup/close behavior remains untested (`TextForge.Desktop`).
2. End-to-end smoke checks are not yet automated.

## 6. Definition of Done for this gap pass

- Phases 1, 2, 3, and 4 are complete.
- All API controllers now have tests (Books, Characters, Locations, Outlines, Versions, Workspace, Window — plus previously covered Scenes, Shell, PlotGrids, Log, Chapters, Series).
- All three previously untested React hooks now have tests (useSceneEditor, useEditorSettings, useWordCountGoal).
- Remaining work: desktop startup/close tests + smoke E2E checks.
