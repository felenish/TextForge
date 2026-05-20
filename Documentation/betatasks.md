# TextForge v0.0.1 Beta — Task List

Ordered by dependency. Complete each section before moving to the next.

---

## Phase 1 — Pre-build fixes

- [ ] **QuestPDF license** — add `QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;` to `App.xaml.cs` `OnStartup()` before any PDF export call
- [ ] **MSBuild target guard** — add `Condition="'$(SkipBuildReactApp)' != 'true'"` to the `BuildReactApp` target in `src/TextForge.Desktop/TextForge.Desktop.csproj`

---

## Phase 2 — Versioning

- [ ] **`Directory.Build.props`** — add `<Version>`, `<AssemblyVersion>`, `<FileVersion>`, `<Product>`, `<Company>`, `<Copyright>` properties
- [ ] Verify version appears in compiled `.exe` Properties → Details tab

---

## Phase 3 — Publish profile

- [ ] Create directory `src/TextForge.Desktop/Properties/PublishProfiles/`
- [ ] Create `win-x64.pubxml` with self-contained, win-x64, PublishSingleFile=false, SkipBuildReactApp=true

---

## Phase 4 — Installer script

- [ ] Create `installer/` directory at repo root
- [ ] Create `installer/TextForge.iss` (Inno Setup script per betaplan.md Part 4)
- [ ] Add `installer/output/` to `.gitignore`
- [ ] Add `publish/` to `.gitignore`

---

## Phase 5 — Local build script

- [ ] Create `scripts/` directory at repo root
- [ ] Create `scripts/build-installer.ps1` per betaplan.md Part 6
- [ ] Install Inno Setup 6 locally (`choco install innosetup` or https://jrsoftware.org/isinfo.php)

---

## Phase 6 — Local end-to-end test

- [ ] Run `.\scripts\build-installer.ps1 -Version 0.0.1` from repo root — confirm it completes without errors
- [ ] Confirm `installer/output/TextForge-Studio-0.0.1-win-x64-Setup.exe` exists
- [ ] Run the installer — verify install directory chooser appears
- [ ] Verify app launches from installed location (`C:\Program Files\TextForge Studio\`)
- [ ] Verify Start Menu shortcut appears
- [ ] Verify optional desktop shortcut works (if selected during install)
- [ ] Open a series, write something, save — basic smoke test
- [ ] Run the uninstaller via Add/Remove Programs — verify clean removal

---

## Phase 7 — GitHub Actions workflow

- [ ] Create `.github/workflows/release.yml` per betaplan.md Part 5
- [ ] Push to a branch and open a PR — verify the existing `ci.yml` still passes
- [ ] Merge the PR

---

## Phase 8 — Tag and release

- [ ] Write a short beta brief for testers (SmartScreen warning, known gaps: title-only search, same-parent DnD only, no scene status picker)
- [ ] Tag the release:
  ```bash
  git tag v0.0.1
  git push origin v0.0.1
  ```
- [ ] Watch GitHub Actions — confirm the release workflow completes
- [ ] Open the draft release on GitHub — verify `TextForge-Studio-0.0.1-win-x64-Setup.exe` is attached
- [ ] Download the attached installer and install it fresh (not from the local build) — final smoke test
- [ ] Add release notes to the draft
- [ ] Publish the release
- [ ] Share download link with beta users

---

## Known gaps to communicate to beta testers

| Gap | Impact |
|---|---|
| SmartScreen "unknown publisher" warning | Click "More info → Run anyway" |
| Search is title-only (no full-text search) | Can't search inside scene prose |
| Drag-and-drop is same-parent only | Can't move a scene between chapters |
| No scene status picker | Status dot visible in sidebar but can't be set |
| No auto-update | Users must download new installer for each version |
