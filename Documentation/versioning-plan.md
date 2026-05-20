# TextForge Versioning Engine — Plan

**Version 1.0 · May 2026**

---

## 1. Overview

The TextForge versioning engine gives writers a safety net for their manuscript. It is modelled loosely on Git's internal design — content-addressed object storage, a linear commit chain, and named branches — but surfaced through writer-friendly language and a fully visual UI. No terminal knowledge or version-control background is required.

**Writer-facing capabilities:**

- Take a named snapshot at any time ("Before rewriting Chapter 12")
- Browse a timeline of all past snapshots
- Restore a single scene or the entire series to any previous snapshot
- Create alternate story branches and switch between them freely
- Compare current scene content to any snapshot (diff viewer)

**The "Last Snapshot" section in the Inspector panel surfaces quick access:** one-click snapshot, the most recent snapshot label and timestamp, and a link to the full Versions sidebar.

---

## 2. Core Concepts

### Writer Terminology → Technical Mapping

| Writer-facing label | Internal term | Meaning |
|---|---|---|
| **Snapshot** | Commit | A named, timestamped point-in-time save of the entire series |
| **Story branch** | Branch | An independent line of snapshots (e.g. "alternate-ending") |
| **Restore** | Checkout / reset | Apply content from a past snapshot to the working files |
| **Timeline** | History | The ordered chain of snapshots on a branch |
| *(hidden)* | Blob | A single scene's content, stored once by content hash |
| *(hidden)* | Object store | Content-addressed storage folder for all blobs |
| *(hidden)* | HEAD | A pointer to the current branch |

### Scope

Snapshots operate at the **series level**: one snapshot captures the content of every scene file across all books in the series. Structural metadata (chapter titles, sort orders) is **not** included in MVP snapshots — only scene text content. Manifest snapshotting is a future enhancement.

---

## 3. Disk Layout

Versioning data lives inside `.textforge/` at the series root. This folder is never touched by the normal save workflow — only the versioning engine reads and writes it.

```
MySeries/
  .textforge/
    HEAD                          ← "ref: refs/branches/main"
    refs/
      branches/
        main                      ← snapshot ID (the tip of this branch)
        alternate-ending          ← snapshot ID
    objects/
      ab/                         ← first 2 hex chars of SHA-256
        cdef1234…                 ← blob file (plain UTF-8 scene text)
    snapshots/
      {snapshot-id}.json          ← snapshot metadata + scene tree
```

### HEAD file

Plain text. Either a symbolic ref (`ref: refs/branches/main`) or a direct snapshot ID (detached state, used while browsing history without switching branches).

### Branch files

One file per branch under `refs/branches/`. Plain text containing the snapshot ID of the branch tip.

### Object files

Content-addressed blobs. The SHA-256 hash of the scene content (lowercase hex, 64 chars) determines the path: `objects/{hash[0..1]}/{hash[2..63]}`. Files contain raw UTF-8 text. Deduplication is automatic — identical content at different points in time shares a single blob.

### Snapshot files

JSON files under `snapshots/`. One per snapshot. Structure:

```json
{
  "id": "uuid",
  "label": "Before rewriting Chapter 12",
  "message": "",
  "timestampUtc": "2026-05-20T14:30:00Z",
  "branch": "main",
  "parentId": "uuid-or-null",
  "scenes": {
    "scene-guid-1": "sha256-hash-of-content",
    "scene-guid-2": "sha256-hash-of-content"
  }
}
```

The `scenes` map records **every scene in the series** at snapshot time — not just scenes that changed. This makes restore O(1) per scene without requiring history traversal. Diffing against the parent uses the parent's `scenes` map to find hash differences.

---

## 4. Domain Models (`TextForge.Versioning`)

```csharp
// Core snapshot metadata
public sealed class Snapshot
{
    public Guid Id { get; init; }
    public string Label { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset TimestampUtc { get; init; }
    public string Branch { get; init; } = "main";
    public Guid? ParentId { get; init; }
    public IReadOnlyDictionary<Guid, string> Scenes { get; init; }
        = new Dictionary<Guid, string>();
}

// Branch pointer
public sealed class Branch
{
    public string Name { get; init; } = string.Empty;
    public Guid? TipSnapshotId { get; set; }  // null = empty branch
}

// Result when comparing a snapshot to its parent
public sealed class SnapshotDiff
{
    public IReadOnlyList<Guid> Added { get; init; } = [];
    public IReadOnlyList<Guid> Modified { get; init; } = [];
    public IReadOnlyList<Guid> Removed { get; init; } = [];
    public IReadOnlyList<Guid> Unchanged { get; init; } = [];
}
```

---

## 5. Service Interface

```csharp
public interface IVersioningService
{
    // Snapshot operations
    Task<Snapshot> TakeSnapshotAsync(
        string seriesRootPath,
        string label,
        IReadOnlyDictionary<Guid, string> sceneContents,
        string message = "",
        CancellationToken ct = default);

    Task<Snapshot?> GetSnapshotAsync(
        string seriesRootPath, Guid snapshotId, CancellationToken ct = default);

    Task<IReadOnlyList<Snapshot>> GetHistoryAsync(
        string seriesRootPath,
        string? branchName = null,
        int limit = 50,
        CancellationToken ct = default);

    Task<SnapshotDiff> GetSnapshotDiffAsync(
        string seriesRootPath, Guid snapshotId, CancellationToken ct = default);

    // Scene operations
    Task<string?> GetSceneContentAtSnapshotAsync(
        string seriesRootPath, Guid sceneId, Guid snapshotId, CancellationToken ct = default);

    Task RestoreSceneAsync(
        string seriesRootPath, Guid sceneId, Guid snapshotId, CancellationToken ct = default);

    Task RestoreSnapshotAsync(
        string seriesRootPath, Guid snapshotId,
        IReadOnlyDictionary<Guid, string> currentSceneFilePaths,
        CancellationToken ct = default);

    // Branch operations
    Task<IReadOnlyList<Branch>> GetBranchesAsync(
        string seriesRootPath, CancellationToken ct = default);

    Task<Branch> CreateBranchAsync(
        string seriesRootPath, string name,
        Guid? fromSnapshotId = null, CancellationToken ct = default);

    Task SwitchBranchAsync(
        string seriesRootPath, string branchName, CancellationToken ct = default);

    Task<string> GetCurrentBranchAsync(
        string seriesRootPath, CancellationToken ct = default);

    Task<Snapshot?> GetLatestSnapshotAsync(
        string seriesRootPath, CancellationToken ct = default);

    // Initialisation
    Task EnsureInitialisedAsync(string seriesRootPath, CancellationToken ct = default);
}
```

`RestoreSceneAsync` writes the blob content back to the scene's working file on disk. It receives the file paths from the controller (which knows where scene files live via the book storage service). `RestoreSnapshotAsync` accepts a map of `sceneId → absoluteFilePath` so the versioning layer never needs to understand book manifest structure.

---

## 6. Internal Services

### ObjectStore

Handles content-addressed blob reads and writes.

```csharp
internal sealed class ObjectStore
{
    string ComputeHash(string content);           // SHA-256, lowercase hex
    Task WriteBlobAsync(string root, string hash, string content, CancellationToken ct);
    Task<string?> ReadBlobAsync(string root, string hash, CancellationToken ct);
    bool BlobExists(string root, string hash);
}
```

All blob writes use `SafeFileWriter` (from `TextForge.Storage.Utilities` — exposed as a shared utility or duplicated). Blobs are written once and never modified; the existence check avoids redundant writes.

### SnapshotStore

Reads and writes snapshot JSON files.

```csharp
internal sealed class SnapshotStore
{
    Task WriteSnapshotAsync(string root, Snapshot snapshot, CancellationToken ct);
    Task<Snapshot?> ReadSnapshotAsync(string root, Guid id, CancellationToken ct);
    Task<IReadOnlyList<Snapshot>> ReadAllAsync(string root, CancellationToken ct);
}
```

### RefStore

Reads and writes `HEAD` and branch pointer files.

```csharp
internal sealed class RefStore
{
    Task<string> ReadHeadAsync(string root, CancellationToken ct);       // branch name or snapshot ID
    Task WriteHeadAsync(string root, string value, CancellationToken ct);
    Task<Guid?> ReadBranchTipAsync(string root, string branch, CancellationToken ct);
    Task WriteBranchTipAsync(string root, string branch, Guid snapshotId, CancellationToken ct);
    Task<IReadOnlyList<string>> ListBranchesAsync(string root, CancellationToken ct);
}
```

---

## 7. API Layer

### VersionsController — Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/versions/status` | Current branch, latest snapshot label + timestamp |
| `POST` | `/api/versions/snapshots` | Take a snapshot; body: `{ label, message? }` |
| `GET` | `/api/versions/snapshots` | Paginated history for current (or named) branch |
| `GET` | `/api/versions/snapshots/{id}` | Snapshot detail: metadata + scene diff vs parent |
| `GET` | `/api/versions/branches` | List all branches with tip snapshot info |
| `POST` | `/api/versions/branches` | Create new branch; body: `{ name, fromSnapshotId? }` |
| `PUT` | `/api/versions/branches/current` | Switch branch; body: `{ name }` |
| `GET` | `/api/versions/scenes/{sceneId}/history` | Snapshots where this scene changed |
| `GET` | `/api/versions/scenes/{sceneId}/at/{snapshotId}` | Scene content at snapshot (for diff/preview) |
| `POST` | `/api/versions/scenes/{sceneId}/restore/{snapshotId}` | Restore one scene from snapshot |
| `POST` | `/api/versions/restore/{snapshotId}` | Restore all scenes from snapshot |

### DTOs

```csharp
// GET /api/versions/status
public sealed record VersionStatusDto(
    string Branch,
    SnapshotSummaryDto? LatestSnapshot);

public sealed record SnapshotSummaryDto(
    Guid Id,
    string Label,
    DateTimeOffset TimestampUtc,
    string Branch,
    int SceneCount);

// GET /api/versions/snapshots
public sealed record SnapshotListDto(
    IReadOnlyList<SnapshotSummaryDto> Snapshots,
    bool HasMore);

// GET /api/versions/snapshots/{id}
public sealed record SnapshotDetailDto(
    Guid Id,
    string Label,
    string Message,
    DateTimeOffset TimestampUtc,
    string Branch,
    Guid? ParentId,
    IReadOnlyList<SceneChangeDto> Changes);

public sealed record SceneChangeDto(
    Guid SceneId,
    string SceneTitle,
    string ChangeKind);    // "added" | "modified" | "removed" | "unchanged"

// GET /api/versions/branches
public sealed record BranchDto(
    string Name,
    bool IsCurrent,
    SnapshotSummaryDto? Tip);

// GET /api/versions/scenes/{id}/at/{snapshotId}
public sealed record SceneAtSnapshotDto(
    Guid SceneId,
    Guid SnapshotId,
    string? Content);   // null if scene did not exist in this snapshot
```

### Controller orchestration for TakeSnapshot

Taking a snapshot requires current scene content. The controller:
1. Calls `seriesWorkspace.RequireOpenSeries()` to get the current `Series`
2. Iterates all books → chapters → scenes; for each scene, reads its content from disk via `IBookStorageService.GetSceneAsync`
3. Builds `Dictionary<Guid, string>` of `sceneId → content`
4. Calls `IVersioningService.TakeSnapshotAsync(series.RootPath, label, sceneContents)`
5. Returns `SnapshotSummaryDto`

Dirty scenes are auto-saved before snapshotting: the controller first calls `SaveBookAsync` for each dirty book, then proceeds.

### Controller orchestration for RestoreSnapshot

1. Load snapshot to get `scenes` map (sceneId → blobHash)
2. Build `sceneId → absoluteFilePath` map from the open series
3. Call `IVersioningService.RestoreSnapshotAsync(rootPath, snapshotId, filePaths)`
4. Signal workspace that scene content is stale (mark all scene cache as invalid)
5. Return 204

When the frontend receives a successful restore, it reloads any open scene editor tabs that were affected.

---

## 8. Frontend Design

### 8.1 Versions Sidebar (`VersionsSidebar.tsx`)

The sidebar has three zones:

**Header zone:**
- Branch selector (dropdown listing all branches; current branch highlighted)
- "+ New Branch" icon button (modal prompts for branch name)
- "Switch Branch" updates HEAD; reloads open scene tabs

**Take Snapshot zone:**
- Text input for snapshot label (placeholder: "Describe what changed…")
- "Take Snapshot" button; disabled when input is empty
- Shows a spinner while the snapshot is being created
- On success: clears input, adds new snapshot card to top of timeline

**Timeline zone:**
- Paginated list of `SnapshotCard` components (newest first)
- Each card shows: label, relative timestamp ("2 hours ago"), branch badge, changed-scene count chip
- Expand button reveals the list of changed scenes for that snapshot:
  - Scene title, change kind badge (modified / added / removed)
  - "Restore this scene" button → calls `POST /api/versions/scenes/{id}/restore/{snapshotId}`
  - "View content" button → opens a read-only preview modal
- "Restore all scenes" button at the bottom of the expanded card
- "Load more" button for pagination

### 8.2 Inspector — Last Snapshot Section

Replaces the current stub with live data from `GET /api/versions/status`:

- Shows the latest snapshot label and a relative timestamp
- "Take Snapshot" button opens an inline label input (pressing Enter or clicking the save icon commits it)
- "View history" link switches the sidebar to Versions mode
- If no snapshot exists: shows "No snapshots yet" placeholder

### 8.3 Scene Content Preview

When the user clicks "View content" on a scene in the timeline:

- A modal opens showing the scene content at that snapshot as read-only text
- A simple line-level diff is shown if the scene has a parent snapshot (added lines in green, removed in red)
- "Restore this scene" button at the bottom of the modal

Diff computation is done client-side using the two content strings (no backend diff endpoint needed for MVP). A minimal Myers diff implementation or a small library (`diff` npm package) is used.

### 8.4 Status Bar Integration

The left side of the status bar already has a branch name stub and version stub (`v0001`). These are wired up:
- Branch name comes from `GET /api/versions/status`
- The version stub is replaced with the snapshot count or the first 6 chars of the latest snapshot ID
- Clicking the branch name opens a branch-switch dropdown inline

---

## 9. Initialisation

On series open (in `SeriesStorageService.OpenSeriesAsync`), `IVersioningService.EnsureInitialisedAsync` is called. This creates:
- `.textforge/` folder
- `refs/branches/` folder
- `objects/` folder
- `snapshots/` folder
- `HEAD` file containing `ref: refs/branches/main`
- `refs/branches/main` containing an empty string (no tip yet)

On series create, the same initialisation runs.

---

## 10. Relationship to Existing Code

| Existing component | Change required |
|---|---|
| `SeriesStorageService` | Call `EnsureInitialisedAsync` in both `CreateSeriesAsync` and `OpenSeriesAsync` |
| `App.xaml.cs` | Register `IVersioningService` → `VersioningService` as singleton |
| `Inspector.tsx` | Replace "Last Snapshot" stub; call `/api/versions/status` |
| `VersionsSidebar.tsx` | Full implementation (currently empty stub) |
| `StatusBar.tsx` | Wire branch name and snapshot counter to versioning status |
| `SceneEditorArea.tsx` | On successful restore, reload affected open tabs |
| `TextForge.Api.csproj` | Add project reference to `TextForge.Versioning` |
| `TextForge.Versioning.csproj` | Add project reference to `TextForge.Core` only |

`TextForge.Versioning` references only `TextForge.Core` — no ASP.NET Core, no WPF, no Storage. The versioning service does its own file IO (it does not go through `IBookStorageService`). It reuses `SafeFileWriter` — that utility should be moved to `TextForge.Core` or duplicated in `TextForge.Versioning` to avoid a Storage → Versioning cross-dependency.

---

## 11. Future Enhancements (Out of MVP Scope)

- **Manifest snapshotting** — capture book structure (chapter/scene ordering, titles) alongside content
- **Branch merging** — three-way merge of scene content from two branches
- **Auto-snapshot triggers** — snapshot on session end, on export, or on a schedule
- **Snapshot tags** — pin important snapshots (like git tags) so they don't scroll off the timeline
- **Scene-level diff view** — character-level diff (not just line-level) using a richer algorithm
- **Export snapshot** — export the full manuscript as it existed at a given snapshot
- **Garbage collection** — prune orphaned blobs after branch deletion
- **Compression** — gzip blobs for large scene files

---

*Confidential — Internal Use Only*
