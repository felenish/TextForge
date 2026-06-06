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

### Non-Goals

- Modules do not have access to the manuscript, scenes, or other modules' data directly. They may call documented API endpoints only.
- No sandboxing in v1 — modules are trusted code, not an extension marketplace. This is a power-user and author-developer feature.
- No hot-reload or in-app installation UI in v1. Modules are discovered from a directory on disk and require an app restart.
- Modules cannot modify the core editor, tab system, or window chrome.

---

## 3. Architecture Overview

The system has three layers of concern:

```
┌─────────────────────────────────────────────────────────────────┐
│  Module Author                                                   │
│  ─────────────                                                   │
│  module.json  (manifest)                                        │
│  ui/          (React component bundle, UMD format)              │
│  api/         (optional: .NET assembly with extra endpoints)    │
└───────────────────────────────┬─────────────────────────────────┘
                                │ discovered at startup
┌───────────────────────────────▼─────────────────────────────────┐
│  TextForge.Modules (new project)                                 │
│  ─────────────────────────────                                   │
│  IModule interface                                              │
│  ModuleManifest model                                           │
│  ModuleRegistry (discovers, validates, registers modules)       │
│  ModuleStorageContext (gives each module an isolated path)      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ wired into
┌───────────────────────────────▼─────────────────────────────────┐
│  TextForge.Api + TextForge.Desktop                               │
│  ─────────────────────────────────                               │
│  /api/modules/* endpoints (list, enable, disable, storage ops)  │
│  Module API assemblies loaded into DI container                 │
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
  "apiAssembly": "api/CorkBoard.Module.dll",
  "storageFolder": "corkboard",
  "capabilities": ["storage", "sidebar"]
}
```

| Field | Required | Description |
|---|---|---|
| `id` | yes | Reverse-DNS unique identifier. Used as the storage directory name. |
| `name` | yes | Human-readable name shown in the sidebar. |
| `version` | yes | SemVer string. |
| `minTextForgeVersion` | yes | Oldest TextForge version this module supports. |
| `entryPoint` | yes | Path to the UMD bundle, relative to `module.json`. |
| `apiAssembly` | no | Optional .NET assembly that registers additional API endpoints. |
| `storageFolder` | yes | Subfolder name used inside the project's `modules/` directory. |
| `capabilities` | yes | List of capabilities the module uses. Currently: `storage`, `sidebar`. |

### 4.2 C# Interface (`IModule`)

Defined in `TextForge.Modules`:

```csharp
public interface IModule
{
    /// <summary>Unique reverse-DNS identifier, matches manifest id.</summary>
    string Id { get; }

    string Name { get; }
    Version Version { get; }

    /// <summary>
    /// Called once when the module is loaded. The module may register its own
    /// services and controllers into the provided IServiceCollection and
    /// WebApplicationBuilder via the builder argument.
    /// </summary>
    void Configure(IServiceCollection services, IConfiguration configuration);

    /// <summary>
    /// Called after the WebApplication is built. Allows the module to map
    /// its own minimal API routes under /api/modules/{id}/*.
    /// </summary>
    void MapEndpoints(WebApplication app, string projectRootPath);
}
```

Modules that only ship a UI component and use the generic storage endpoints do not need an `apiAssembly`. They implement storage through the generic `/api/modules/{id}/storage/*` endpoints provided by TextForge itself.

### 4.3 Generic Storage API

TextForge provides a generic, file-backed storage API for modules that do not need custom logic:

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

### 4.4 Frontend Contract

TextForge expects the `entryPoint` UMD bundle to export a single default React component:

```typescript
// Expected module export shape
export default function CorkBoardModule(props: ModuleProps): JSX.Element;

// Props passed by TextForge
interface ModuleProps {
  projectId: string;       // Current open project ID
  moduleId: string;        // This module's id from the manifest
  apiBase: string;         // e.g. "/api/modules/com.example.corkboard"
  storageBase: string;     // e.g. "/api/modules/com.example.corkboard/storage"
  isActive: boolean;       // Whether this module's sidebar tab is currently selected
}
```

The module component is responsible for its own internal routing, state management, and layout within the content area. It may use any library it bundles itself. It must not assume access to TextForge's internal React context.

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
4. If `apiAssembly` is specified, load the assembly, find the type implementing `IModule`, and call `Configure`.
5. Register the module in `ModuleRegistry`.

```csharp
public sealed class ModuleRegistry
{
    private readonly List<ModuleRegistration> _modules = [];

    public IReadOnlyList<ModuleRegistration> Modules => _modules.AsReadOnly();

    public void Discover(string scanPath, IServiceCollection services, IConfiguration config) { ... }
    public ModuleRegistration? Get(string moduleId) { ... }
    public string GetStoragePath(string projectRoot, string moduleId) { ... }
}

public sealed class ModuleRegistration
{
    public ModuleManifest Manifest { get; init; } = null!;
    public string ModuleDirectory { get; init; } = string.Empty;
    public IModule? Implementation { get; init; } // null for UI-only modules
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

## 8. Frontend Integration

### 8.1 Sidebar Navigation

The sidebar already shows section tabs (Manuscript, Characters, Locations, etc.). Enabled modules appear as additional tabs after built-in sections, using the `icon` from their manifest and their `name` as the label.

```typescript
// ModuleTab renders in the sidebar navigation list
interface ModuleTab {
  moduleId: string;
  name: string;
  icon: string;       // SVG URL served from /api/modules/{id}/asset?path=icon.svg
}
```

### 8.2 Module Loader Component

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

### 8.3 Asset Serving

The TextForge API provides a secure asset endpoint that resolves paths only within the module's own directory, preventing directory traversal:

```
GET /api/modules/{id}/asset?path=ui/icon.svg
GET /api/modules/{id}/asset?path=ui/corkboard.umd.js
```

---

## 9. Refactoring Built-In Sections

The Characters, Locations, Outlines, and Plot Grids sections are refactored to be "built-in modules" — they implement the same `IModule` interface and manifest format. This serves two purposes:

1. It proves the module system is sufficient and complete.
2. It unifies the sidebar registration path so there is no special-casing for built-in vs. external modules.

Built-in module directories ship inside the TextForge installation:

```
TextForge/
  └── modules/
       └── builtin/
            ├── characters/
            │    ├── module.json
            │    └── api/TextForge.Modules.Characters.dll
            ├── locations/
            ├── outlines/
            └── plotgrids/
```

The built-in modules do not need a separate UI bundle — instead, `module.json` can declare `"entryPoint": null` and `"builtIn": true`, which tells `ModuleLoader` to render the existing React component already compiled into the main app bundle. This is the only distinction between built-in and external modules.

---

## 10. Implementation Phases

### Phase 1 — Foundation (No External Modules Yet)

**Goal:** Establish the contracts without breaking anything. All existing functionality continues to work.

- [ ] Create `TextForge.Modules` project with `IModule`, `ModuleManifest`, `ModuleRegistry`, `ModuleRegistration`.
- [ ] Define `ModuleProps` TypeScript interface in the frontend.
- [ ] Add `modules.enabled` array to `BookProject` manifest model (defaults to all built-in sections enabled).
- [ ] Add `GET /api/modules` endpoint returning discovered modules and enabled state.
- [ ] Add `POST /api/modules/{id}/enable` and `disable` endpoints.
- [ ] Add `GET/PUT/DELETE /api/modules/{id}/storage/**` generic storage endpoints.
- [ ] Add `GET /api/modules/{id}/asset` secure file-serving endpoint.
- [ ] Write unit tests for `ModuleRegistry` discovery and path validation.

### Phase 2 — Refactor Built-In Sections

**Goal:** Prove the system by converting existing worldbuilding sections.

- [ ] Create `module.json` manifests for Characters, Locations, Outlines, Plot Grids.
- [ ] Create thin `IModule` implementations for each that call `Configure` to register their existing storage services.
- [ ] Update sidebar navigation to read from `ModuleRegistry` instead of a hardcoded list.
- [ ] No visible change to the user — the sidebar looks identical.

### Phase 3 — External Module Loading

**Goal:** A developer can place a module directory in `%APPDATA%\TextForge\modules\` and it appears in the sidebar after restart.

- [ ] Implement assembly loading for `apiAssembly` modules.
- [ ] Implement `ModuleLoader` React component with dynamic UMD bundle loading.
- [ ] Implement secure asset serving endpoint.
- [ ] Add a Modules section to the Settings panel showing discovered modules and enable/disable toggles.
- [ ] Write and publish a reference module (Cork Board or simple sticky-note board) as the canonical example.

### Phase 4 — Developer Experience

**Goal:** Make module authoring approachable.

- [ ] Publish a `textforge-module-template` — a minimal Vite project preconfigured to build a UMD bundle targeting the `ModuleProps` interface.
- [ ] Publish TypeScript type definitions for `ModuleProps` and the storage API response shapes as an npm package.
- [ ] Add a module development mode: TextForge watches a configured directory and hot-reloads the UI bundle on change (without requiring a full app restart).
- [ ] Document the full module contract in `Documentation/module-authoring-guide.md`.

---

## 11. Security Considerations

Modules are trusted code — they run in the same process as TextForge. This is acceptable for the author-developer use case (v1 target audience: the author themselves or small teams). Document clearly that modules are not sandboxed.

- The generic storage API enforces path boundaries: it will not serve or write files outside `MyNovel/modules/{moduleId}/`.
- The asset endpoint enforces the same boundary: it resolves paths only within the module's installation directory.
- Module discovery skips any manifest where `id` contains path separators, `..`, or other traversal patterns.
- A future v2 could introduce WebView2-based sandboxing or a WASM runtime for untrusted modules, but this is explicitly out of scope for v1.

---

## 12. Open Questions

1. **Module versioning across project files** — If a user opens an old project on a machine where a module is not installed, should TextForge warn them that data may exist for a missing module? Yes, and it should display the module ID and version from the manifest embedded in the project.

2. **Module data in exports** — Should PDF/EPUB export ever include module data? Likely not by default, but modules could declare an optional export hook in a later version.

3. **Module communication** — Should modules be able to call each other or emit events (e.g., "character created")? Defer to v2. In v1, modules are isolated. An event bus could be introduced later without breaking the v1 contract.

4. **UMD vs ES modules** — The UMD format is chosen for broad compatibility without a build toolchain on TextForge's side. If WebView2 ships full ESM import map support by the time Phase 3 ships, native ESM modules with import maps are worth reconsidering.

---

*This document is a planning artifact. Implementation details will evolve during development.*
