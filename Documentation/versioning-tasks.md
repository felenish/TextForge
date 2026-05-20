# TextForge Versioning Engine — Task List

**Version 1.0 · May 2026**

Tasks are organised by phase. Read `versioning-plan.md` for full design rationale before starting. Mark tasks `[x]` as they are completed.

---

## Phase V1 — Core Versioning Engine

**Goal:** A fully tested `TextForge.Versioning` project that can take snapshots, retrieve history, and restore scenes with no dependency on ASP.NET Core or WPF.

### V1.1 — Project Setup

- [ ] Add `TextForge.Versioning` project reference to `TextForge.Api.csproj`
- [ ] Add `TextForge.Core` project reference to `TextForge.Versioning.csproj` (no other references)
- [ ] Move `SafeFileWriter` from `TextForge.Storage/Utilities/` to `TextForge.Core/Utilities/` so both Storage and Versioning can use it without a circular dependency
  - Update `TextForge.Storage` to import from the new location
  - Confirm `dotnet build` still passes for all projects
- [ ] Add `System.Text.Json` to `TextForge.Versioning` (it is a BCL package, no extra NuGet needed)

### V1.2 — Domain Models

- [ ] Create `Models/Snapshot.cs` in `TextForge.Versioning`
  - Properties: `Guid Id`, `string Label`, `string Message`, `DateTimeOffset TimestampUtc`, `string Branch`, `Guid? ParentId`, `IReadOnlyDictionary<Guid, string> Scenes`
- [ ] Create `Models/Branch.cs`
  - Properties: `string Name`, `Guid? TipSnapshotId`
- [ ] Create `Models/SnapshotDiff.cs`
  - Properties: `IReadOnlyList<Guid> Added`, `IReadOnlyList<Guid> Modified`, `IReadOnlyList<Guid> Removed`, `IReadOnlyList<Guid> Unchanged`
- [ ] Create `Interfaces/IVersioningService.cs` in `TextForge.Versioning`
  - Copy interface signature from `versioning-plan.md §5`

### V1.3 — ObjectStore

- [ ] Create `Services/Internal/ObjectStore.cs` (internal sealed class)
  - `string ComputeHash(string content)` — SHA-256 via `System.Security.Cryptography.SHA256`, lowercase hex, 64 chars
  - `Task WriteBlobAsync(string seriesRoot, string hash, string content, CancellationToken ct)` — path: `objects/{hash[0..1]}/{hash[2..63]}`; use `SafeFileWriter`; skip write if blob already exists
  - `Task<string?> ReadBlobAsync(string seriesRoot, string hash, CancellationToken ct)` — returns null if blob file not found
  - `bool BlobExists(string seriesRoot, string hash)` — synchronous check

### V1.4 — SnapshotStore

- [ ] Create `Services/Internal/SnapshotStore.cs` (internal sealed class)
  - `Task WriteSnapshotAsync(string seriesRoot, Snapshot snapshot, CancellationToken ct)` — serialize to JSON; write to `snapshots/{id}.json` via `SafeFileWriter`
  - `Task<Snapshot?> ReadSnapshotAsync(string seriesRoot, Guid id, CancellationToken ct)` — returns null if file not found; throws `InvalidVersioningDataException` on bad JSON
  - `Task<IReadOnlyList<Snapshot>> ReadAllAsync(string seriesRoot, CancellationToken ct)` — reads all `.json` files in `snapshots/`; skips unreadable files with a log warning

### V1.5 — RefStore

- [ ] Create `Services/Internal/RefStore.cs` (internal sealed class)
  - `Task<string> ReadHeadAsync(string seriesRoot, CancellationToken ct)` — reads `.textforge/HEAD`; strips `"ref: refs/branches/"` prefix if present to return branch name; returns raw snapshot ID if detached
  - `Task WriteHeadAsync(string seriesRoot, string value, CancellationToken ct)` — if `value` looks like a branch name write `"ref: refs/branches/{value}"`; otherwise write the snapshot ID directly
  - `Task<Guid?> ReadBranchTipAsync(string seriesRoot, string branch, CancellationToken ct)` — reads `refs/branches/{branch}`; returns null if empty or not found
  - `Task WriteBranchTipAsync(string seriesRoot, string branch, Guid snapshotId, CancellationToken ct)` — writes snapshot ID to `refs/branches/{branch}`
  - `Task<IReadOnlyList<string>> ListBranchesAsync(string seriesRoot, CancellationToken ct)` — lists filenames in `refs/branches/`

### V1.6 — VersioningService

- [ ] Create `Services/VersioningService.cs` implementing `IVersioningService`
- [ ] Inject `ILogger<VersioningService>`; store `ObjectStore`, `SnapshotStore`, `RefStore` as private readonly fields (constructed internally, not injected, since they are internal)
- [ ] Implement `EnsureInitialisedAsync`:
  - Create `.textforge/`, `.textforge/refs/branches/`, `.textforge/objects/`, `.textforge/snapshots/` directories
  - Write `HEAD` file if it does not exist (`ref: refs/branches/main`)
  - Write empty `refs/branches/main` if it does not exist
- [ ] Implement `TakeSnapshotAsync`:
  - Compute hash for each `(sceneId, content)` pair; call `ObjectStore.WriteBlobAsync` for any new blobs
  - Create `Snapshot` with new `Guid.NewGuid()`, current timestamp, current branch, parent = current branch tip
  - Write snapshot via `SnapshotStore.WriteSnapshotAsync`
  - Update branch tip via `RefStore.WriteBranchTipAsync`
  - Return the new snapshot
- [ ] Implement `GetHistoryAsync`:
  - Resolve branch name (default to current HEAD branch)
  - Read branch tip snapshot ID
  - Walk the `ParentId` chain by loading snapshots in sequence; stop at `limit` or when parent is null
  - Return list in reverse chronological order (newest first)
- [ ] Implement `GetSnapshotDiffAsync`:
  - Load the requested snapshot and its parent snapshot (if any)
  - Compare `Scenes` dictionaries: keys only in child = added; keys only in parent = removed; same key, different hash = modified; same hash = unchanged
  - Return `SnapshotDiff`
- [ ] Implement `GetSceneContentAtSnapshotAsync`:
  - Load snapshot; look up scene's blob hash; call `ObjectStore.ReadBlobAsync`; return content or null
- [ ] Implement `RestoreSceneAsync`:
  - Get blob content via `GetSceneContentAtSnapshotAsync`; throw if scene not found in snapshot
  - Write content to `{seriesRoot}/...` — **the service receives the absolute file path from the caller**, not from the snapshot. Add a `string sceneFilePath` parameter overload, or extend the interface.

  > **Design note:** `IVersioningService.RestoreSceneAsync` signature must accept an `absoluteFilePath` parameter because the versioning layer does not know the book folder structure. The controller resolves the path and passes it.

- [ ] Implement `RestoreSnapshotAsync`:
  - Accept `IReadOnlyDictionary<Guid, string> sceneFilePaths` (sceneId → absolute path)
  - For each scene in the snapshot, call `GetSceneContentAtSnapshotAsync` and write to disk via `SafeFileWriter`
  - Log each restore at Debug level
- [ ] Implement `GetBranchesAsync`:
  - List branch names via `RefStore.ListBranchesAsync`; for each, read tip snapshot; read current HEAD to mark `IsCurrent`
  - Return `IReadOnlyList<Branch>`
- [ ] Implement `CreateBranchAsync`:
  - Validate branch name (no spaces, no `/`, not empty, max 100 chars)
  - Resolve `fromSnapshotId` — if null, use current HEAD's tip
  - Write branch file via `RefStore.WriteBranchTipAsync` with the resolved snapshot ID
  - Return `Branch`
- [ ] Implement `SwitchBranchAsync`:
  - Verify branch exists; update HEAD via `RefStore.WriteHeadAsync`
- [ ] Implement `GetCurrentBranchAsync`: read HEAD, return branch name
- [ ] Implement `GetLatestSnapshotAsync`: resolve current branch tip; load and return snapshot or null
- [ ] Create `Exceptions/InvalidVersioningDataException.cs` in `TextForge.Versioning`
- [ ] Create `Exceptions/SnapshotNotFoundException.cs` in `TextForge.Versioning`

### V1.7 — Branch Name Validation

- [ ] Create `Utilities/BranchNameValidator.cs`
  - Rules: non-empty, max 100 chars, alphanumeric + `-` + `_` + `.` only, no leading/trailing dots or dashes
  - `static void Validate(string name)` — throws `ArgumentException` with user-readable message on failure

### V1.8 — Versioning Tests

All tests must pass before Phase V2 begins.

- [ ] `TakeSnapshotAsync_CreatesSnapshotFile` — verify `snapshots/{id}.json` exists after snapshot
- [ ] `TakeSnapshotAsync_WritesBlobs_ForAllScenes` — verify blob files are created for each scene
- [ ] `TakeSnapshotAsync_DeduplicatesBlobs` — two scenes with identical content produce one blob file
- [ ] `TakeSnapshotAsync_UpdatesBranchTip` — `refs/branches/main` contains new snapshot ID
- [ ] `TakeSnapshotAsync_SetsParentId_FromPreviousSnapshot` — second snapshot references first's ID
- [ ] `GetHistoryAsync_ReturnsSnapshotsInReverseChronologicalOrder` — three snapshots, newest first
- [ ] `GetHistoryAsync_RespectsLimit` — requesting limit=2 with 5 snapshots returns 2
- [ ] `GetSnapshotDiffAsync_IdentifiesModifiedScenes` — change one scene, diff shows it as modified
- [ ] `GetSnapshotDiffAsync_IdentifiesAddedAndRemovedScenes` — scene in child not in parent = added
- [ ] `GetSceneContentAtSnapshotAsync_ReturnsCorrectContent` — round-trips content through take + retrieve
- [ ] `GetSceneContentAtSnapshotAsync_ReturnsNull_WhenSceneNotInSnapshot`
- [ ] `RestoreSceneAsync_WritesCorrectContentToDisk` — file on disk matches snapshotted content
- [ ] `RestoreSnapshotAsync_RestoresAllScenes` — all scene files match snapshot content after restore
- [ ] `CreateBranchAsync_CreatesBranchFile` — `refs/branches/{name}` file exists
- [ ] `CreateBranchAsync_ThrowsOnInvalidName` — spaces, slashes, empty string rejected
- [ ] `SwitchBranchAsync_UpdatesHEAD`
- [ ] `GetBranchesAsync_ReturnsAllBranches_WithCurrentFlag`
- [ ] `EnsureInitialisedAsync_IsIdempotent` — calling twice does not throw or corrupt state

**Phase V1 exit criteria:** All 18+ tests pass. Zero warnings in `TextForge.Versioning`. `dotnet build TextForge.sln` clean.

---

## Phase V2 — API Layer

**Goal:** REST endpoints for all versioning operations, correctly orchestrated with the existing workspace and storage services.

### V2.1 — Register Service

- [ ] Register `IVersioningService` → `VersioningService` as singleton in `App.xaml.cs`
- [ ] Add project reference `TextForge.Api` → `TextForge.Versioning`
- [ ] Call `IVersioningService.EnsureInitialisedAsync(series.RootPath)` inside `SeriesStorageService.CreateSeriesAsync` and `SeriesStorageService.OpenSeriesAsync`

### V2.2 — DTOs

- [ ] Create `Dtos/VersionStatusDto.cs` — `string Branch`, `SnapshotSummaryDto? LatestSnapshot`
- [ ] Create `Dtos/SnapshotSummaryDto.cs` — `Guid Id`, `string Label`, `DateTimeOffset TimestampUtc`, `string Branch`, `int SceneCount`
- [ ] Create `Dtos/SnapshotDetailDto.cs` — id, label, message, timestamp, branch, parentId, `IReadOnlyList<SceneChangeDtoo> Changes`
- [ ] Create `Dtos/SceneChangeDto.cs` — `Guid SceneId`, `string SceneTitle`, `string ChangeKind` (`"added"` | `"modified"` | `"removed"` | `"unchanged"`)
- [ ] Create `Dtos/SnapshotListDto.cs` — `IReadOnlyList<SnapshotSummaryDto> Snapshots`, `bool HasMore`
- [ ] Create `Dtos/BranchDto.cs` — `string Name`, `bool IsCurrent`, `SnapshotSummaryDto? Tip`
- [ ] Create `Dtos/SceneAtSnapshotDto.cs` — `Guid SceneId`, `Guid SnapshotId`, `string? Content`

### V2.3 — VersionsController

- [ ] Create `Controllers/VersionsController.cs` in `TextForge.Api`
- [ ] Inject `ISeriesWorkspaceService`, `IBookStorageService`, `IVersioningService`
- [ ] `GET /api/versions/status` — return `VersionStatusDto` (current branch + latest snapshot summary)
- [ ] `POST /api/versions/snapshots` — body: `{ label, message? }`
  - Validate `label` is non-empty
  - Load all scene contents (see §V2.4)
  - Call `TakeSnapshotAsync`
  - Return `SnapshotSummaryDto` with 201 Created
- [ ] `GET /api/versions/snapshots?branch=&limit=&offset=` — paginated history
  - Call `GetHistoryAsync`; apply offset manually after retrieval for MVP
  - Return `SnapshotListDto`
- [ ] `GET /api/versions/snapshots/{id:guid}` — snapshot detail with scene diffs
  - Call `GetSnapshotAsync` + `GetSnapshotDiffAsync`
  - Build `SceneChangeDto` list — resolve scene titles from open series
  - Return `SnapshotDetailDto`
- [ ] `GET /api/versions/branches` — list branches
- [ ] `POST /api/versions/branches` — body: `{ name, fromSnapshotId? }`; create branch; return `BranchDto`
- [ ] `PUT /api/versions/branches/current` — body: `{ name }`; switch branch; return 204
- [ ] `GET /api/versions/scenes/{sceneId:guid}/history` — snapshots where this scene changed
  - Walk history; filter to snapshots where scene hash differs from parent; return list of `SnapshotSummaryDto`
- [ ] `GET /api/versions/scenes/{sceneId:guid}/at/{snapshotId:guid}` — return `SceneAtSnapshotDto`
- [ ] `POST /api/versions/scenes/{sceneId:guid}/restore/{snapshotId:guid}` — restore one scene
  - Resolve `absoluteFilePath` from open series; call `RestoreSceneAsync`; return 204
- [ ] `POST /api/versions/restore/{snapshotId:guid}` — restore all scenes
  - Build `sceneId → absoluteFilePath` map; call `RestoreSnapshotAsync`; return 204

### V2.4 — Scene Content Gathering Helper

- [ ] Create private `GatherSceneContentsAsync` method in `VersionsController` (or a dedicated `VersioningOrchestrator` service in `TextForge.Api`)
  - Iterates `series.Books → chapters → scenes`
  - Calls `IBookStorageService.GetSceneAsync` for each scene to load content
  - Returns `Dictionary<Guid, string>` (sceneId → content)
  - Skips scenes where the file does not exist (logs a warning)

### V2.5 — Manual API Verification

- [ ] `GET /api/versions/status` — returns `{ "branch": "main", "latestSnapshot": null }` on fresh series
- [ ] `POST /api/versions/snapshots` with label "Initial snapshot" — creates first snapshot; re-call status returns the snapshot
- [ ] `GET /api/versions/snapshots` — returns list with the new snapshot
- [ ] `GET /api/versions/snapshots/{id}` — returns detail with all scenes as "added" (no parent)
- [ ] `POST /api/versions/branches` with name "alternate-ending" — creates branch
- [ ] `GET /api/versions/branches` — returns main (current) and alternate-ending
- [ ] `PUT /api/versions/branches/current` with `{ "name": "alternate-ending" }` — switches branch
- [ ] Take another snapshot on the new branch; confirm `GET /api/versions/snapshots` returns only the new branch history
- [ ] `GET /api/versions/scenes/{id}/at/{snapshotId}` — returns scene content as it was when snapshot was taken
- [ ] `POST /api/versions/restore/{snapshotId}` — edit a scene, take a snapshot, edit again, then restore: file content reverts correctly

**Phase V2 exit criteria:** All endpoints return correct responses. Snapshot → restore round-trip verified manually. All API error cases return `ErrorDto`.

---

## Phase V3 — Versions Sidebar

**Goal:** Full implementation of `VersionsSidebar.tsx` replacing the current empty stub.

### V3.1 — API Client

- [ ] Create `src/api/versions.ts`
  - Interfaces: `VersionStatusDto`, `SnapshotSummaryDto`, `SnapshotDetailDto`, `SceneChangeDto`, `BranchDto`, `SceneAtSnapshotDto`
  - Functions: `getVersionStatus`, `takeSnapshot`, `getHistory`, `getSnapshotDetail`, `getBranches`, `createBranch`, `switchBranch`, `getSceneHistory`, `getSceneAtSnapshot`, `restoreScene`, `restoreSnapshot`

### V3.2 — SnapshotCard Component

- [ ] Create `src/components/versions/SnapshotCard.tsx`
  - Props: `snapshot: SnapshotSummaryDto`, `isExpanded: boolean`, `onToggle`, `onRestoreScene`, `onRestoreAll`, `onViewScene`
  - Collapsed: label, relative timestamp (`"2 hours ago"`), branch badge, changed-scenes chip (shows count from detail)
  - Expanded: loads `SnapshotDetailDto` on first expand (lazy); renders list of `SceneChangeRow`
  - Each `SceneChangeRow`: scene title, change kind badge, "Restore" button, "View" button
  - "Restore all scenes" button at bottom of expanded card (disabled for the very latest snapshot)
  - Show a confirm dialog before restore: "Restore all scenes to this snapshot? Unsaved changes will be lost."

### V3.3 — BranchSelector Component

- [ ] Create `src/components/versions/BranchSelector.tsx`
  - Dropdown listing all branches; current branch shown with a check
  - "New branch…" option at the bottom; clicking opens an inline input for the branch name
  - On branch select: calls `switchBranch`; refreshes sidebar snapshot list and status bar
  - Validate branch name client-side before calling API (no spaces, etc.)

### V3.4 — TakeSnapshot Form

- [ ] Create `src/components/versions/TakeSnapshotForm.tsx`
  - Controlled text input for snapshot label
  - "Take Snapshot" button (disabled when input is empty or a snapshot is in progress)
  - Loading state: spinner + "Saving…" label
  - On success: clear input, call `onSnapshotTaken` callback to refresh the timeline

### V3.5 — VersionsSidebar

- [ ] Rewrite `src/components/explorer/VersionsSidebar.tsx` (currently a stub)
  - Load `getVersionStatus()` on mount; refresh after snapshot taken or branch switched
  - Load `getHistory()` on mount and branch change
  - Render: `BranchSelector` + `TakeSnapshotForm` + timeline of `SnapshotCard` components
  - "Load more" button triggers next page of history
  - Empty timeline state: "No snapshots yet. Take your first snapshot to begin tracking changes."
  - Error state: toast + retry button

### V3.6 — Scene Content Preview Modal

- [ ] Create `src/components/versions/ScenePreviewModal.tsx`
  - Fetches `getSceneAtSnapshot(sceneId, snapshotId)` on open
  - If previous snapshot exists, fetches that too and computes a line-level diff
  - Renders read-only content; diff lines highlighted: added (green left border), removed (red, strikethrough)
  - "Restore this scene" button at bottom; on confirm calls `restoreScene`; closes modal; reloads scene tab if open
  - "Close" button / Escape key dismisses

### V3.7 — Diff Utility

- [ ] Create `src/utils/diff.ts`
  - `computeLineDiff(before: string, after: string): DiffLine[]`
  - `DiffLine = { kind: 'equal' | 'added' | 'removed', text: string }`
  - Use a simple LCS-based line diff (implement from scratch or import the `diff` npm package — prefer the `diff` package for correctness)
  - If using `diff` package: `npm install diff` + `npm install --save-dev @types/diff`

### V3.8 — CSS

- [ ] Add `.vs-*` CSS block to `index.css` for versions sidebar styles
  - `.vs-branch-row` — flex row with branch selector and new-branch button
  - `.vs-form` — snapshot label input + button row
  - `.vs-timeline` — scrollable snapshot list
  - `.vs-card` — individual snapshot card (border, padding, hover state)
  - `.vs-card-header` — label, timestamp, badges
  - `.vs-card-body` — expanded scene list
  - `.vs-scene-row` — scene title, change badge, action buttons
  - `.vs-change-badge` — small coloured pill: modified (accent), added (green), removed (red)
  - `.vs-preview-modal` — modal overlay for scene content preview
  - `.vs-diff-line.added` / `.vs-diff-line.removed` / `.vs-diff-line.equal`

**Phase V3 exit criteria:** Versions sidebar loads real data. Can take a snapshot, browse history, expand a card to see changed scenes, and restore a scene — all from the sidebar.

---

## Phase V4 — Inspector & Status Bar Integration

**Goal:** The Inspector's "Last Snapshot" section shows live data. The status bar shows the real branch name.

### V4.1 — Inspector Last Snapshot

- [ ] In `Inspector.tsx`, call `getVersionStatus()` alongside `getScene()` on `activeSceneId` change
- [ ] Replace the "Last Snapshot" stub section with:
  - Show latest snapshot label and relative timestamp (or "No snapshots yet" if null)
  - Inline "Take Snapshot" button: clicking shows a text input in-place; pressing Enter or clicking a checkmark calls `takeSnapshot` with the entered label
  - On snapshot success: refresh local `latestSnapshot` state; show a brief success toast
  - "View history" text-link — calls `setMode('versions')` via a passed-in callback or a workspace context setter

### V4.2 — Status Bar Branch Name

- [ ] In `StatusBar.tsx`, call `getVersionStatus()` on mount (with a short cache — `stale-while-revalidate` pattern using a module-level variable or `useRef` timestamp check)
- [ ] Replace the branch name stub with the real `branch` value from `VersionStatusDto`
- [ ] Replace the `v0001` stub with a `#` + snapshot count or a short snapshot ID prefix

### V4.3 — Reload Open Tabs After Restore

- [ ] In `SceneEditorArea.tsx`, expose a `reloadScene(sceneId: string)` handle (via `useImperativeHandle` or a context method)
- [ ] After `restoreScene` or `restoreSnapshot` succeeds in `VersionsSidebar` or the preview modal, call `reloadScene` for each affected scene that is currently open in a tab
- [ ] `reloadScene` re-fetches the scene content, updates the editor, and clears dirty state

**Phase V4 exit criteria:** Inspector shows real last-snapshot data. Taking a snapshot from the inspector works. Status bar shows the real branch name. Restoring a scene while it is open in an editor tab reloads the editor content.

---

## Phase V5 — Polish & Edge Cases

### V5.1 — Error Handling

- [ ] `POST /api/versions/snapshots` — if series has no scenes, return a meaningful error: "No scenes found to snapshot"
- [ ] `POST /api/versions/branches` — duplicate branch name returns 409 Conflict with `ErrorDto`
- [ ] `PUT /api/versions/branches/current` — switching to non-existent branch returns 404
- [ ] `POST /api/versions/restore/{snapshotId}` — if any scene file write fails, partial restore should still report success for the scenes that succeeded; log failures with warnings; return 207 Multi-Status with per-scene results (or 204 + a warnings array — choose one and document it)
- [ ] Frontend: show a toast on all versioning API failures with the `ErrorDto.message`

### V5.2 — "main" Branch Auto-Creation

- [ ] If `EnsureInitialisedAsync` detects `.textforge/` already exists but `refs/branches/main` is missing (legacy series), create the file silently with an empty tip

### V5.3 — Snapshot on Series Open (Optional / Future)

- [ ] Decision: do NOT auto-snapshot on open for MVP; leave as a post-MVP enhancement. Document the decision in code with a `// TODO(post-MVP)` comment in the appropriate location.

### V5.4 — Final Acceptance Test (Manual)

- [ ] Open a series with at least two books and several scenes
- [ ] Take a named snapshot ("Before test")
- [ ] Edit content in two scenes; save
- [ ] Take another snapshot ("After edits")
- [ ] Verify `GET /api/versions/snapshots` returns both snapshots
- [ ] Open Versions sidebar: both cards visible; "After edits" card expanded shows the two changed scenes
- [ ] Click "View" on one changed scene: preview modal opens with line diff (before/after highlighted)
- [ ] Click "Restore this scene" in the modal: editor tab reloads with the old content
- [ ] Click "Restore all scenes" on the first snapshot card: all scenes revert; editor tabs reload
- [ ] Create a new branch "alternate-ending" from the current snapshot
- [ ] Switch to "alternate-ending" in branch selector
- [ ] Take a snapshot on the new branch; confirm history only shows that snapshot
- [ ] Switch back to "main": history shows original two snapshots
- [ ] Inspector "Last Snapshot" section shows the last snapshot for the current scene's context
- [ ] Take a snapshot from the Inspector: snapshot appears in the Versions sidebar

**Phase V5 exit criteria:** All acceptance test steps pass. No regressions in manuscript editing, character/location/outline editors, plot grids, or inspector.

---

## Deferred

These items are documented but explicitly out of scope for this implementation phase.

- [ ] Manifest snapshotting (chapter/scene structure, not just content)
- [ ] Branch merging (three-way text merge)
- [ ] Auto-snapshot triggers (on session end, on export)
- [ ] Snapshot tags / pinning
- [ ] Character-level diff (beyond line-level)
- [ ] Export from snapshot
- [ ] Blob garbage collection
- [ ] Blob compression
