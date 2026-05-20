# TextForge v0.0.1 Beta Release Plan

## Overview

Self-contained win-x64 build → Inno Setup `.exe` installer → GitHub Actions release workflow triggered by a git tag.

## Stack Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Runtime bundling | Self-contained win-x64 | Zero prerequisites for beta users |
| Installer format | Inno Setup (.exe) | Simpler to author/maintain than WiX; used by VS Code, Python |
| Architecture | x64 only | Covers 95%+ of Windows machines; single artifact |
| Code signing | None for v0.0.1 | Beta users click "More info → Run anyway" on SmartScreen |
| Trigger | Git tag `v*.*.*` | Clean, reproducible, maps tag → release |

## Codebase Facts Relevant to Build

| Item | Detail |
|---|---|
| Entry point | `TextForge.Desktop.exe` (WinExe, net10.0-windows) |
| .NET runtimes required | Core + WindowsDesktop + AspNetCore — all bundled via self-contained |
| WebView2 | Required; pre-installed on all Win 10/11 via Windows Update (2026); installer shows message if missing |
| React build | Vite outputs to `src/TextForge.Desktop/wwwroot/` via `vite.config.ts` |
| MSBuild npm step | `BuildReactApp` target checks `$(ProgramW6432)\nodejs` — won't find Actions-installed Node; must be skipped in CI via `/p:SkipBuildReactApp=true` |
| QuestPDF | Community license call required before first PDF export |
| Estimated installer size | ~55–70 MB compressed (LZMA2), ~180–220 MB installed |

---

## Part 1 — Versioning

**File:** `Directory.Build.props`

Add inside the existing `<PropertyGroup>`:

```xml
<Version>0.0.1</Version>
<AssemblyVersion>0.0.1.0</AssemblyVersion>
<FileVersion>0.0.1.0</FileVersion>
<Product>TextForge Studio</Product>
<Company>TextForge</Company>
<Copyright>Copyright © 2026 TextForge</Copyright>
```

Surfaces in: `.exe` Properties → Details, `dotnet publish` output filename, Inno Setup via `/DAppVersion`.

---

## Part 2 — Publish Profile

**File:** `src/TextForge.Desktop/Properties/PublishProfiles/win-x64.pubxml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project>
  <PropertyGroup>
    <Configuration>Release</Configuration>
    <Platform>Any CPU</Platform>
    <PublishDir>..\..\..\..\publish\win-x64\</PublishDir>
    <PublishProtocol>FileSystem</PublishProtocol>
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
    <SelfContained>true</SelfContained>
    <PublishSingleFile>false</PublishSingleFile>
    <SkipBuildReactApp>true</SkipBuildReactApp>
  </PropertyGroup>
</Project>
```

`PublishSingleFile=false` — keeps DLLs separate; more reliable with WebView2 native binaries and easier to debug from beta feedback.

---

## Part 3 — MSBuild Target Guard

**File:** `src/TextForge.Desktop/TextForge.Desktop.csproj`

Add `Condition` to the existing `BuildReactApp` target so CI can skip it:

```xml
<Target Name="BuildReactApp"
        BeforeTargets="Build"
        Condition="'$(SkipBuildReactApp)' != 'true'">
  <!-- existing content unchanged -->
</Target>
```

---

## Part 4 — Inno Setup Script

**File:** `installer/TextForge.iss`

```pascal
; TextForge Studio — Inno Setup script
; Build: iscc /DAppVersion=0.0.1 installer\TextForge.iss

#ifndef AppVersion
  #define AppVersion "0.0.1"
#endif

#define AppName      "TextForge Studio"
#define AppPublisher "TextForge"
#define AppExeName   "TextForge.Desktop.exe"
#define PublishDir   "..\publish\win-x64"

[Setup]
AppId={{A7F3C2D1-9B4E-4F8A-BC12-3D5E7A091234}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL=https://github.com/felenish/TextForge
AppSupportURL=https://github.com/felenish/TextForge/issues
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
OutputDir=installer\output
OutputBaseFilename=TextForge-Studio-{#AppVersion}-win-x64-Setup
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName} {#AppVersion}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
Source: "{#PublishDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}";           Filename: "{app}\{#AppExeName}"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"
Name: "{userdesktop}\{#AppName}";     Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; \
  Description: "Launch {#AppName}"; \
  Flags: nowait postinstall skipifsilent

[Code]
// WebView2 is pre-installed on Win 10/11 via Windows Update in 2026.
// This check shows a helpful message on the rare machine where it is missing.
function IsWebView2Installed(): Boolean;
var
  Version: String;
begin
  Result := RegQueryStringValue(
    HKLM,
    'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
    'pv', Version
  ) and (Version <> '0.0.0.0') and (Version <> '');
  if not Result then
    Result := RegQueryStringValue(
      HKCU,
      'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
      'pv', Version
    ) and (Version <> '0.0.0.0') and (Version <> '');
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if not IsWebView2Installed() then
      MsgBox(
        'TextForge Studio requires the Microsoft WebView2 Runtime.' + #13#10 +
        'Please visit https://developer.microsoft.com/en-us/microsoft-edge/webview2/ ' +
        'and install the Evergreen Standalone runtime, then launch TextForge Studio.',
        mbInformation, MB_OK
      );
  end;
end;
```

**Important:** The `AppId` GUID must never change between versions. Inno Setup uses it to detect upgrades vs. side-by-side installs.

---

## Part 5 — GitHub Actions Release Workflow

**File:** `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v[0-9]+.[0-9]+.[0-9]+'

permissions:
  contents: write

jobs:
  build-and-release:
    runs-on: windows-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup .NET 10
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.x'

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24.x'
          cache: 'npm'
          cache-dependency-path: ui/textforge-ui/package-lock.json

      - name: Install frontend dependencies
        working-directory: ui/textforge-ui
        run: npm ci

      - name: Build React frontend
        working-directory: ui/textforge-ui
        run: npm run build
        # Vite outputs to src/TextForge.Desktop/wwwroot/ per vite.config.ts

      - name: Restore NuGet packages
        run: dotnet restore TextForge.slnx

      - name: Run tests
        run: dotnet test TextForge.slnx --no-restore --configuration Release

      - name: Extract version from tag
        id: version
        run: |
          $v = "${{ github.ref_name }}" -replace '^v', ''
          echo "number=$v" >> $env:GITHUB_OUTPUT

      - name: Publish self-contained win-x64
        run: |
          dotnet publish src/TextForge.Desktop/TextForge.Desktop.csproj `
            --configuration Release `
            --runtime win-x64 `
            --self-contained true `
            --output publish/win-x64 `
            /p:SkipBuildReactApp=true `
            /p:Version=${{ steps.version.outputs.number }}

      - name: Install Inno Setup 6
        run: choco install innosetup --yes --no-progress

      - name: Build installer
        run: iscc /DAppVersion=${{ steps.version.outputs.number }} installer\TextForge.iss

      - name: Create GitHub Release (draft)
        uses: softprops/action-gh-release@v2
        with:
          name: "TextForge Studio v${{ steps.version.outputs.number }}"
          draft: true
          generate_release_notes: true
          files: installer/output/TextForge-Studio-*-Setup.exe
```

Releases are created as **drafts** — review and write release notes before publishing.

---

## Part 6 — Local Build Script

**File:** `scripts/build-installer.ps1`

```powershell
# Run from repo root: .\scripts\build-installer.ps1 -Version 0.0.1
param([string]$Version = "0.0.1")

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "==> Building React frontend..." -ForegroundColor Cyan
Push-Location ui/textforge-ui
npm ci
npm run build
Pop-Location

Write-Host "==> Publishing .NET app (self-contained win-x64)..." -ForegroundColor Cyan
dotnet publish src/TextForge.Desktop/TextForge.Desktop.csproj `
  --configuration Release `
  --runtime win-x64 `
  --self-contained true `
  --output publish/win-x64 `
  /p:SkipBuildReactApp=true `
  /p:Version=$Version

Write-Host "==> Building installer..." -ForegroundColor Cyan
iscc /DAppVersion=$Version installer\TextForge.iss

Write-Host ""
Write-Host "Done: installer\output\TextForge-Studio-$Version-win-x64-Setup.exe" -ForegroundColor Green
```

Requires Inno Setup 6 installed locally (`choco install innosetup` or from https://jrsoftware.org/isinfo.php).

---

## Part 7 — .gitignore additions

```
# Publish output
/publish/

# Inno Setup output
/installer/output/
```

---

## Pre-release checklist (do before tagging)

- [ ] QuestPDF license call added to `App.xaml.cs` `OnStartup()`:
  ```csharp
  QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
  ```
- [ ] Local installer built and installed successfully
- [ ] App launches from installed location (not from dev build)
- [ ] Uninstaller works cleanly (Add/Remove Programs)
- [ ] Beta brief written telling users: SmartScreen → "More info → Run anyway"

---

## Release steps for v0.0.1

```bash
git tag v0.0.1
git push origin v0.0.1
```

GitHub Actions builds the installer, creates a draft release with the `.exe` attached. Review the draft, add release notes, publish.

---

## Future release considerations

| Item | When |
|---|---|
| Code signing certificate (EV or OV) | v0.1.0 — eliminates SmartScreen warning |
| Auto-update (Squirrel.Windows or custom check) | v0.2.0 |
| ARM64 installer | When ARM Windows share warrants it |
| Delta/patch installers | Post-v1.0 |
