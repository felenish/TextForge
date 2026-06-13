# TextForge Module System — Design Plan

*Architecture • Extension Points • Implementation Phases*

**Draft — June 2026**

---

## 1. Vision

TextForge already ships with worldbuilding sections (Characters, Locations, Outlines, Plot Grids) that follow a consistent file-based pattern. The Module System formalizes that pattern into a public contract so that third-party authors — or power users — can add their own worldbuilding workspaces to the sidebar without touching the TextForge source code.

**Motivating examples:**

- A murder mystery author wants a **Murder Board** — a canvas with suspects, clues, and string connections.
- A pantser wants a **Cork Board** of sticky notes, each pinned with free text and a color.
- A worldbuilder wants a **Timeline** that is visual and zoomable, not just a list.
- A game writer wants a **Faction Tracker** with hierarchical org charts.

A module author ships a folder that TextForge discovers at startup. TextForge gives the module an isolated storage directory inside the project folder and a slot in the sidebar navigation. The module author owns every UI decision inside that slot.

---

## 2. Goals & Non-Goals

### Goals

- Modules are first-class citizens in the sidebar navigation — indistinguishable from built-in sections.
- Module data is stored inside the book project folder, making it portable and VCS-friendly.
- Modules can be enabled or disabled per-project.
- The contract between TextForge and a module is stable and versioned.
- Built-in sections (Characters, Locations, etc.) are refactored to implement this same contract internally, proving the system is real.
- Module scope is worldbuilding data only — the same domain as Characters, Locations, Outlines, and Plot Grids.

### Non-Goals

- Modules do not have access to the manuscript, scenes, or other modules' data directly. They may call documented API endpoints only.
- No sandboxing in v1 — modules are trusted code, not an extension marketplace. This is a power-user and author-developer feature.
- No hot-reload or in-app installation UI in v1. Modules are discovered from a directory on disk and require an app restart.
- Modules cannot modify the core editor, tab system, or window chrome.
- No C# / .NET extension points. Modules are JavaScript only (UMD or ESM). All backend behaviour is provided by TextForge's generic storage and hyperlink APIs.
- No export hooks (PDF/EPUB). Module data is worldbuilding context, not manuscript content.

---

## 3. Architecture Overview

The system has three layers of concern:

```
┌─────────────────────────────────────────────────────────────────┐
│  Module Author                                                   │
│  ─────────────                                                   │
│  module.json  (manifest)                                        │
│  ui/          (JS bundle — UMD or ESM)                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │ discovered at startup
┌───────────────────────────────▼─────────────────────────────────┐
│  TextForge.Modules (new project)                                 │
│  ─────────────────────────────                                   │
│  ModuleManifest model                                           │
│  ModuleRegistry (discovers, validates, registers modules)       │
│  ModuleStorageContext (gives each module an isolated path)      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ wired into
┌───────────────────────────────▼─────────────────────────────────┐
│  TextForge.Api + TextForge.Desktop                               │
│  ─────────────────────────────────                               │
│  /api/modules/* endpoints (list, enable, disable, storage ops)  │
│  Frontend ModuleLoader component (lazy-loads UI bundles)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. The Module Contract

### 4.1 Module Manifest (`module.json`)

Every module ships a `module.json` at its root:

```json
{
  "id": "com.example.corkboard",
  "name": "Cork Board",
  "version": "1.0.0",
  "minTextForgeVersion": "1.2.0",
  "description": "Sticky-note canvas for brainstorming.",
  "author": "Jane Writer",
  "icon": "ui/icon.svg",
  "entryPoint": "ui/corkboard.umd.js",
  "storageFolder": "corkboard"
}
```

| Field | Required | Description |
|---|---|---|
| `id` | yes | Reverse-DNS unique identifier. Used as the storage directory name. |
| `name` | yes | Human-readable name shown in the sidebar. |
| `version` | yes | SemVer string. |
| `minTextForgeVersion` | yes | Oldest TextForge version this module supports. |
| `entryPoint` | yes | Path to the JS bundle (UMD or ESM), relative to `module.json`. |
| `storageFolder` | yes | Subfolder name used inside the project's `modules/` directory. |

There is no `apiAssembly` field. All backend functionality is provided by TextForge's generic storage and hyperlink APIs described below.

### 4.2 Generic Storage API

TextForge provides a generic, file-backed storage API for all modules:

```
GET    /api/modules/{moduleId}/storage/{**path}
PUT    /api/modules/{moduleId}/storage/{**path}
DELETE /api/modules/{moduleId}/storage/{**path}
GET    /api/modules/{moduleId}/storage?list={dir}
```

The module's data lives at:

```
MyNovel/
  └── modules/
       └── com.example.corkboard/
            └── (anything the module writes)
```

The module UI calls these endpoints with `fetch` exactly as the built-in sections call `/api/characters/*`. From the module author's perspective, they have a private filesystem they can organize however they like.

### 4.3 Hyperlink API

Modules are worldbuilding workspaces, so they may need to link to entities in other sections (e.g., a Murder Board node linking to a Character). TextForge exposes a read-only hyperlink resolution API:

```
GET /api/hyperlinks/resolve?target={entityRef}
```

`entityRef` is a structured string identifying an entity in any built-in or module section — e.g., `characters:uuid-1234` or `com.example.corkboard:suspect-42`. The response returns enough display metadata (name, section, icon) for the module to render a link chip without reading another module's storage directly.

Modules that want their own entities to be linkable declare a `"linkable": true` flag in `module.json` and implement the `resolveLinkable` export in their JS bundle (see §4.4). TextForge calls this function when another section requests resolution of a reference into this module.

```json
{
  "id": "com.example.murderboard",
  ...
  "linkable": true
}
```

Modules do not call each other's storage APIs directly. All cross-module references go through the hyperlink API.

### 4.4 Frontend Contract

TextForge expects the `entryPoint` bundle to export a default React component and, optionally, a `resolveLinkable` function. Both UMD and ESM formats are accepted — the format is inferred from the file extension (`.umd.js` → UMD, `.js` / `.mjs` → ESM).

```typescript
// Required: the UI component
export default function CorkBoardModule(props: ModuleProps): JSX.Element;

// Optional: required only if module.json declares "linkable": true
export function resolveLinkable(entityId: string): LinkableMeta | null;

// Props passed by TextForge
interface ModuleProps {
  projectId: string;       // Current open project ID
  moduleId: string;        // This module's id from the manifest
  apiBase: string;         // e.g. "/api/modules/com.example.corkboard"
  storageBase: string;     // e.g. "/api/modules/com.example.corkboard/storage"
  isActive: boolean;       // Whether this module's sidebar tab is currently selected
}

// Return shape for hyperlink resolution
interface LinkableMeta {
  id: string;              // The entityId passed in
  name: string;            // Display name for the link chip
  icon?: string;           // Optional icon URL
}
```

The module component is responsible for its own internal routing, state management, and layout within the content area. It may use any library it bundles itself. It must not assume access to TextForge's internal React context.

**UMD modules** register on `window.__textforge_modules[moduleId]` and are loaded via a `<script>` tag.

**ESM modules** are loaded via a dynamic `import()`. TextForge does not provide an import map, so ESM modules must be fully self-contained (no bare specifier imports).

---

## 5. Storage Layout

When a module is enabled for a project, TextForge creates its storage directory automatically:

```
MyNovel/
  ├── book.tfbook
  ├── manuscript/
  ├── characters/
  ├── locations/
  ├── modules/
  │    ├── com.example.corkboard/
  │    │    ├── notes.json          ← module decides its own format
  │    │    └── board-state.json
  │    └── com.example.murderboard/
  │         └── suspects.json
  └── .textforge/
```

Module directories inside `modules/` are never read or modified by TextForge core — they belong entirely to the module.

---

## 6. Module Discovery

At startup, `ModuleRegistry` scans two locations in order:

1. **Built-in modules** — shipped with TextForge inside the installation directory under `modules/builtin/`. This is where the existing worldbuilding sections will live once refactored.
2. **User modules** — discovered from a configurable path (default: `%APPDATA%\TextForge\modules\` on Windows).

Discovery process:

1. Enumerate subdirectories in each scan path.
2. For each subdirectory containing a valid `module.json`, parse the manifest.
3. Validate `minTextForgeVersion` — skip and log if incompatible.
4. Validate that `id` contains no path separators or traversal patterns.
5. Register the module in `ModuleRegistry`.

No assembly loading occurs. Modules are pure JavaScript; the registry holds only manifest metadata and the path to the module directory.

```csharp
public sealed class ModuleRegistry
{
    private readonly List<ModuleRegistration> _modules = [];

    public IReadOnlyList<ModuleRegistration> Modules => _modules.AsReadOnly();

    public void Discover(string scanPath) { ... }
    public ModuleRegistration? Get(string moduleId) { ... }
    public string GetStoragePath(string projectRoot, string moduleId) { ... }
}

public sealed class ModuleRegistration
{
    public ModuleManifest Manifest { get; init; } = null!;
    public string ModuleDirectory { get; init; } = string.Empty;
}
```

---

## 7. Project-Level Module State

Each book project tracks which modules are enabled and any per-project module configuration in its manifest (`book.tfbook`):

```json
{
  "version": 1,
  "id": "...",
  "title": "My Novel",
  "modules": {
    "enabled": [
      "com.example.corkboard",
      "com.example.murderboard"
    ]
  }
}
```

API endpoints for module management:

```
GET  /api/modules                          — list all discovered modules with enabled state
POST /api/modules/{id}/enable              — enable module for current project
POST /api/modules/{id}/disable             — disable module for current project
```

---

## 8. Migration Strategy

### 8.1 `book.tfbook` Format Versioning

The `book.tfbook` manifest uses a top-level `"version"` integer. When TextForge opens a project, it reads this version and runs any pending migrations before handing the manifest to the rest of the application.

Migration rules:

| From version | To version | Change |
|---|---|---|
| (absent) | 1 | No `modules` key present. Add `"modules": { "enabled": [] }`. All built-in sections are implicitly enabled and require no entry. |
| 1 | 2 | *(reserved — no change yet)* |

Migrations are additive and non-destructive. The original file is backed up to `book.tfbook.bak` before the first write of an upgraded manifest. If migration fails, TextForge opens the project in read-only mode and surfaces an error with the backup path.

```csharp
public interface IBookManifestMigration
{
    int FromVersion { get; }
    int ToVersion   { get; }

    /// <summary>Mutates the parsed JSON document in place. Must be idempotent.</summary>
    void Migrate(JsonNode manifest);
}
```

`BookManifestMigrator` collects all `IBookManifestMigration` implementations registered in DI, sorts them by `FromVersion`, and applies them in order until `manifest["version"]` matches the current application version.

### 8.2 Module-Level Data Migrations

Module data lives entirely inside `MyNovel/modules/{moduleId}/` and TextForge core never interprets it. Because modules are JavaScript-only, there is no server-side migration hook. Module authors handle data migrations inside their JS bundle.

TextForge persists the last-seen version of each enabled module inside `book.tfbook`:

```json
{
  "version": 1,
  "modules": {
    "enabled": ["com.example.corkboard"],
    "versions": {
      "com.example.corkboard": "1.0.0"
    }
  }
}
```

On each project open, if the installed module version differs from the stored version, TextForge:

1. Backs up the module's storage directory to `modules/{moduleId}.bak-{storedVersion}/`.
2. Passes `previousVersion` and `currentVersion` to the module component via `ModuleProps`.
3. Updates `versions[moduleId]` in `book.tfbook` immediately after the module mounts successfully.

The module component is responsible for detecting version drift (via the `previousVersion` prop) and running any necessary data migrations against the storage API before rendering. If migration fails, the module should surface an error state within its own UI — it does not abort the project open.

```typescript
interface ModuleProps {
  projectId: string;
  moduleId: string;
  apiBase: string;
  storageBase: string;
  isActive: boolean;
  previousVersion: string | null;  // null on first enable; stored version otherwise
  currentVersion: string;          // version from the installed manifest
}
```

### 8.3 Missing-Module Detection

When a project is opened and `modules.enabled` lists an ID that `ModuleRegistry` does not know about:

- TextForge logs a warning and skips creating the sidebar tab.
- On the Settings → Modules panel, the module appears as **"Not installed"** with its last-known version and ID, so the user knows data exists and can locate the module.
- The `modules/{moduleId}/` data directory is left untouched.

This addresses Open Question 1 (see §12).

---

## 9. Frontend Integration

### 9.1 Sidebar Navigation

The sidebar already shows section tabs (Manuscript, Characters, Locations, etc.). Enabled modules appear as additional tabs after built-in sections, using the `icon` from their manifest and their `name` as the label.

```typescript
// ModuleTab renders in the sidebar navigation list
interface ModuleTab {
  moduleId: string;
  name: string;
  icon: string;       // SVG URL served from /api/modules/{id}/asset?path=icon.svg
}
```

### 9.2 Module Loader Component

A `ModuleLoader` component handles dynamic loading of module UI bundles:

```typescript
// Conceptual — implementation details subject to change
function ModuleLoader({ moduleId, manifest }: ModuleLoaderProps) {
  const [Component, setComponent] = useState<React.ComponentType<ModuleProps> | null>(null);

  useEffect(() => {
    // Dynamically load the UMD bundle via a <script> tag
    // The bundle registers itself on window.__textforge_modules[moduleId]
    loadModuleBundle(manifest.entryPoint, moduleId).then(setComponent);
  }, [moduleId]);

  if (!Component) return <LoadingSpinner />;

  return (
    <Component
      projectId={currentProjectId}
      moduleId={moduleId}
      apiBase={`/api/modules/${moduleId}`}
      storageBase={`/api/modules/${moduleId}/storage`}
      isActive={true}
    />
  );
}
```

Module bundles are served as static files from `TextForge.Desktop` via a dedicated route:

```
GET /api/modules/{id}/asset?path={relative-path-in-module-dir}
```

### 9.3 Asset Serving

The TextForge API provides a secure asset endpoint that resolves paths only within the module's own directory, preventing directory traversal:

```
GET /api/modules/{id}/asset?path=ui/icon.svg
GET /api/modules/{id}/asset?path=ui/corkboard.umd.js
```

---

## 10. Refactoring Built-In Sections

The Characters, Locations, Outlines, and Plot Grids sections are refactored to be "built-in modules" — they implement the same `IModule` interface and manifest format. This serves two purposes:

1. It proves the module system is sufficient and complete.
2. It unifies the sidebar registration path so there is no special-casing for built-in vs. external modules.

Built-in module directories ship inside the TextForge installation:

```
TextForge/
  └── modules/
       └── builtin/
            ├── characters/
            │    └── module.json
            ├── locations/
            │    └── module.json
            ├── outlines/
            │    └── module.json
            └── plotgrids/
                 └── module.json
```

Built-in modules do not need a separate JS bundle — `module.json` declares `"entryPoint": null` and `"builtIn": true`, which tells `ModuleLoader` to render the existing React component already compiled into the main app bundle. Their storage and API routes remain implemented in .NET as they are today; the module system simply provides the manifest and sidebar registration. This is the only distinction between built-in and external modules.

---

## 11. Implementation Phases

### Phase 1 — Foundation (No External Modules Yet)

**Goal:** Establish the contracts without breaking anything. All existing functionality continues to work.

- [ ] Create `TextForge.Modules` project with `ModuleManifest`, `ModuleRegistry`, `ModuleRegistration`.
- [ ] Define `ModuleProps` TypeScript interface in the frontend (including `previousVersion` / `currentVersion`).
- [ ] Add `modules.enabled` array and `modules.versions` map to `BookProject` manifest model (defaults to all built-in sections enabled).
- [ ] Implement `IBookManifestMigration` interface and `BookManifestMigrator` with version-0→1 migration (adds `modules` key to pre-module manifests).
- [ ] Implement module version tracking: backup storage directory when version changes, pass version props to module component, update `versions` map after successful mount.
- [ ] Add `GET /api/modules` endpoint returning discovered modules and enabled state.
- [ ] Add `POST /api/modules/{id}/enable` and `disable` endpoints.
- [ ] Add `GET/PUT/DELETE /api/modules/{id}/storage/**` generic storage endpoints.
- [ ] Add `GET /api/modules/{id}/asset` secure file-serving endpoint.
- [ ] Add `GET /api/hyperlinks/resolve` endpoint for cross-section entity resolution.
- [ ] Write unit tests for `ModuleRegistry` discovery and path validation.
- [ ] Write unit tests for `BookManifestMigrator` covering the version-0→1 migration and multi-step chains.

### Phase 2 — Refactor Built-In Sections

**Goal:** Prove the system by converting existing worldbuilding sections.

- [x] Create `module.json` manifests for Characters, Locations, Outlines, Plot Grids (with `"builtIn": true`, `"entryPoint": null`).
- [x] Update sidebar navigation to read from `ModuleRegistry` instead of a hardcoded list.
- [x] No visible change to the user — the sidebar looks identical.

### Phase 3 — External Module Loading

**Goal:** A developer can place a module directory in `%APPDATA%\TextForge\modules\` and it appears in the sidebar after restart.

- [ ] Implement `ModuleLoader` React component with dynamic UMD and ESM bundle loading.
- [ ] Implement secure asset serving endpoint.
- [ ] Add a Modules section to the Settings panel showing discovered modules and enable/disable toggles.
- [ ] Implement `resolveLinkable` call path in the hyperlink API (load the module bundle server-side or delegate resolution to the frontend).
- [ ] Write and publish a reference module (Cork Board or simple sticky-note board) as the canonical example.

### Phase 4 — Developer Experience

**Goal:** Make module authoring approachable.

- [ ] Publish a `textforge-module-template` — a minimal Vite project preconfigured to build both a UMD and ESM bundle targeting the `ModuleProps` interface.
- [ ] Publish TypeScript type definitions for `ModuleProps`, `LinkableMeta`, and the storage API response shapes as an npm package.
- [ ] Add a module development mode: TextForge watches a configured directory and hot-reloads the UI bundle on change (without requiring a full app restart).
- [ ] Document the full module contract in `Documentation/module-authoring-guide.md`.

---

## 12. Security Considerations

Module JS bundles run inside WebView2 with the same origin as the TextForge frontend — they are trusted code. This is acceptable for the author-developer use case (v1 target audience: the author themselves or small teams). Document clearly that modules are not sandboxed.

- The generic storage API enforces path boundaries: it will not serve or write files outside `MyNovel/modules/{moduleId}/`.
- The asset endpoint enforces the same boundary: it resolves paths only within the module's installation directory.
- Module discovery skips any manifest where `id` contains path separators, `..`, or other traversal patterns.
- The hyperlink API only returns display metadata — it never exposes raw storage of another module.
- A future v2 could introduce a stricter WebView2 sandbox or a separate renderer process for untrusted modules, but this is explicitly out of scope for v1.

---

## 13. Resolved Design Decisions

The following questions were considered and closed:

1. **Module versioning across project files** — Missing modules are surfaced in Settings → Modules as "Not installed" with their last-known ID and version. The `modules/versions` map in `book.tfbook` always carries the last-active version so the user can locate the correct module. *(See §8.3.)*

2. **Module data in exports** — No. Module data is worldbuilding context, not manuscript content. No export hook will be provided, even in future versions. If a module author needs export-adjacent behaviour, it should be implemented inside the module's own UI (e.g., copy-to-clipboard, markdown export).

3. **Module communication** — Modules do not communicate directly. Cross-module references are handled entirely through the hyperlink API (`/api/hyperlinks/resolve`), which provides read-only display metadata. No event bus or direct storage cross-access. *(See §4.3.)*

4. **UMD vs ES modules** — Both are supported. TextForge infers the format from the file extension. ESM modules must be fully self-contained (no bare specifier imports). *(See §4.4.)*

5. **C# extension points** — None. Modules are JavaScript only. All backend behaviour is provided by the generic storage API and the hyperlink API. This removes assembly loading complexity and eliminates the `IModule` interface entirely for external modules. *(Reflected throughout.)*

6. **Module storage migration** — Since there is no server-side hook, modules detect version drift via the `previousVersion` prop passed by TextForge and run migrations themselves using the storage API. TextForge backs up the storage directory before passing a changed version. *(See §8.2.)*

---

*This document is a planning artifact. Implementation details will evolve during development.*
