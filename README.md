# TextForge Studio

A desktop-first writing IDE for novelists and long-form fiction writers. TextForge treats a manuscript the way a developer treats a codebase — hierarchical structure, human-readable files on disk, tabs, command palette, find & replace, and version history.

> **Platform:** Windows 10 / 11 only (WPF + WebView2)

---

## Install

Download the latest installer from the [Releases](https://github.com/felenish/TextForge/releases) page.

**Windows SmartScreen warning:** Because the installer is not yet code-signed, Windows may show a "Windows protected your PC" prompt. Click **More info → Run anyway** to proceed.

**Requirements:** Windows 10 or 11 (64-bit). All other dependencies (.NET runtime, WebView2) are bundled in the installer.

---

## Features

- **Manuscript explorer** — organize work as Series → Books → Chapters → Scenes with drag-and-drop reordering
- **Multi-tab editor** — open and edit multiple scenes simultaneously
- **Rich text editing** — bold, italic, underline, font and size controls, typewriter mode
- **Autosave** — configurable background save (30 s / 1 min / 2 min / 5 min)
- **Find & Replace** — real-time search with match navigation and replace-all in the active scene
- **Command palette** — keyboard-first access to common actions (`Ctrl+P`)
- **File menu** — open, create, save, and close series; recent series history persisted across sessions
- **Inspector panel** — per-scene metadata and word count
- **Word count goal** — daily writing target with progress indicator
- **Minimap** — document overview with synchronized scroll
- **Themes** — dark, light, and sepia
- **Export** — PDF and EPUB output
- **Version history** — snapshot-based scene history with branch support
- **Local-first** — all data is stored as plain files on disk; no cloud dependency, no proprietary database

---

## Architecture

TextForge uses a single-process hybrid architecture:

```
┌─────────────────────────────────────────────────────┐
│  TextForge.Desktop  (WPF host, net10.0-windows)     │
│                                                     │
│   ┌───────────────────┐   ┌─────────────────────┐  │
│   │  ASP.NET Core /   │   │  WebView2            │  │
│   │  Kestrel          │◄──│  (React 19 SPA)      │  │
│   │  (random port,    │   │                      │  │
│   │   localhost only) │   └─────────────────────┘  │
│   └───────────────────┘                             │
└─────────────────────────────────────────────────────┘
```

The WPF application starts an in-process Kestrel server on a random available port. WebView2 navigates to that localhost address and communicates with the backend via a REST API. The React SPA is compiled into the `wwwroot` folder at build time by an MSBuild target.

### On-disk file format

All data is human-readable and version-control-friendly:

| File | Purpose |
|------|---------|
| `series.tfseries` | JSON series manifest (title, ID, book list) |
| `book.tfbook` | JSON book manifest (chapters, scenes, sort order) |
| `*.md` | Scene content as plain text |
| `%APPDATA%\TextForge\settings.json` | Application settings (recent series list) |

---

## Project Structure

```
TextForge/
├── src/
│   ├── TextForge.Core/        # Domain models, interfaces, exceptions, validation
│   ├── TextForge.Storage/     # File-system storage services (series, books, scenes)
│   ├── TextForge.Api/         # ASP.NET Core REST API — controllers, DTOs, services
│   ├── TextForge.Versioning/  # Snapshot-based version history
│   ├── TextForge.Export/      # PDF/EPUB export pipeline
│   └── TextForge.Desktop/     # WPF shell, WebView2 host, platform services
├── ui/
│   └── textforge-ui/          # React 19 + TypeScript + Vite frontend
├── tests/
│   ├── TextForge.Core.Tests/
│   ├── TextForge.Storage.Tests/
│   └── TextForge.Versioning.Tests/
├── installer/                 # Inno Setup script (TextForge.iss)
├── scripts/                   # Local build helpers (build-installer.ps1)
├── Documentation/             # Design documents and planning notes
└── TextForge.slnx             # .NET solution file
```

---

## Prerequisites

| Requirement | Version | Notes |
|------------|---------|-------|
| Windows | 10 or 11 | WPF is Windows-only |
| [.NET SDK](https://dotnet.microsoft.com/download) | **10.0** | `dotnet --version` to verify |
| [Node.js](https://nodejs.org/) | **22 LTS or later** | Includes npm; needed for the React build |
| [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) | Any current | Pre-installed on Windows 11; may need manual install on Windows 10 |

---

## Building and Running

### 1. Clone the repository

```powershell
git clone https://github.com/felenish/TextForge.git
cd TextForge
```

### 2. Restore dependencies

```powershell
# Restore NuGet packages
dotnet restore

# Install npm packages
cd ui/textforge-ui
npm install
cd ../..
```

### 3. Build and run

```powershell
dotnet run --project src/TextForge.Desktop/TextForge.Desktop.csproj
```

The MSBuild pipeline automatically runs `npm run build` before compiling the C# projects, so the React app is always up to date when you run from source.

To build without running:

```powershell
dotnet build
```

To build a self-contained release binary:

```powershell
dotnet publish src/TextForge.Desktop/TextForge.Desktop.csproj -p:PublishProfile=win-x64
```

To build the full installer (requires [Inno Setup 6+](https://jrsoftware.org/isinfo.php)):

```powershell
.\scripts\build-installer.ps1 -Version 0.0.1
```

---

## Development Workflow

### Frontend-only (UI/CSS iteration)

Run the Vite dev server for instant hot-module reload in the browser:

```powershell
cd ui/textforge-ui
npm run dev
```

This opens the React app at `http://localhost:5173`. API calls will fail without a running backend, but it is useful for layout and styling work.

### Full-stack development

Run the desktop app normally with `dotnet run`. When you make frontend changes, rebuild the frontend bundle and then relaunch:

```powershell
cd ui/textforge-ui && npm run build
cd ../..
dotnet run --project src/TextForge.Desktop/TextForge.Desktop.csproj
```

Or just use `dotnet run` again — the MSBuild target re-runs the frontend build automatically.

### Skipping the frontend build (faster C# iteration)

When only changing C# code, skip the npm build step:

```powershell
dotnet run --project src/TextForge.Desktop/TextForge.Desktop.csproj -p:SkipBuildReactApp=true
```

---

## Running Tests

```powershell
dotnet test
```

Run a specific test project:

```powershell
dotnet test tests/TextForge.Storage.Tests/TextForge.Storage.Tests.csproj
```

Run with coverage:

```powershell
dotnet test --collect:"XPlat Code Coverage"
```

---

## Tech Stack

**Backend**

| Technology | Role |
|-----------|------|
| .NET 10 / C# | All backend and desktop code |
| ASP.NET Core (Kestrel) | In-process REST API server |
| WPF | Native Windows window chrome and host |
| Microsoft.Web.WebView2 | Chromium browser control embedded in WPF |

**Frontend**

| Technology | Role |
|-----------|------|
| React 19 | UI framework |
| TypeScript 6 | Type-safe JavaScript |
| Vite 8 | Build tooling and dev server |
| CSS custom properties | Theming (dark / light / sepia) |

---

## Contributing

1. Fork the repository and create a feature branch from `main`.
2. Follow the code style defined in `.editorconfig` — 4-space indent for C#, 2-space for TypeScript/JSON.
3. Add or update tests for any changed storage or domain logic.
4. Open a pull request with a clear description of what changed and why.

---

## License

*License TBD.*
