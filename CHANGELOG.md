# Changelog

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
