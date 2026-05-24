# Get Beta Ready — TextForge Studio v0.1.0

Tasks grouped by priority. Each item has a concrete definition of done.

---

## 🔴 Blocking — Fix Before Tagging v0.1.0

### 1. Wire Ctrl+Shift+S (Save All)
HelpTab documents this shortcut but `AppLayout.tsx` never registers it. Users who rely on it will think the app is broken.
- Add `(e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S'` branch in the `AppLayout` keydown handler, calling `editorRef.current?.saveAll()`.

### 2. Fix HelpTab — Remove Stale "No Auto-Update" Limitation
The HelpTab known-limitations list still says "No auto-update — download a new installer from the Releases page". Auto-update is fully implemented. Remove or replace this line.

### 3. Fix HelpTab — Remove Stale "Drag & Drop Same-Parent Only" Limitation
Cross-chapter scene moving was added in v0.0.3. Remove this limitation.

### 4. Harden Crash / Unexpected-Exit Recovery
There is currently no recovery path if the app closes mid-edit (power loss, crash, force-quit). Unsaved content between autosaves is lost permanently.
- **Option A (Recommended):** Write a temporary recovery draft to `%AppData%\TextForge\recovery\<sceneId>.txt` on every dirty change (debounced ~5 s). On app start, detect orphaned recovery files and offer to restore them.
- **Option B (Minimal):** Shorten default autosave interval from 60 s to 15 s.

### 5. Graceful Handling When Backend Is Unreachable
If the ASP.NET API is slow to start or crashes, the React app hangs silently with no indication. `useSeriesExplorer`'s `run()` wrapper toasts some errors but API timeouts just stall.
- Add a timeout to the API client (`client.ts`) — e.g., `AbortSignal.timeout(10_000)`.
- Show a visible banner or status indicator when the backend cannot be reached.
- Guard the startup auto-open (`tf-last-series`) so a failed load shows an actionable error rather than a blank screen.

---

## 🟡 High Value — Strong Recommendation Before Beta

### 6. Add Undo/Redo to Editor Context Menu
Undo and Redo were added to the Edit menu but are not in the right-click `EditorContextMenu`. Users expect them there.
- Add Undo / Redo items at the top of `EditorContextMenu.tsx`, calling `document.execCommand('undo'/'redo')`, disabled (grayed) when right-clicking outside the scene editor.

### 7. Add About Dialog
There is no Help → About option. Beta testers filing bugs need to know their exact version.
- Add an About entry to the Help menu (or Settings) showing: app name, version (read from `Directory.Build.props` via the `/api/workspace/version` endpoint or a build-time injection), copyright, and a link to the GitHub repo / issue tracker.
- The title bar already shows a hardcoded `v0.1` — make this dynamic so it matches the actual build.

### 8. First-Run Onboarding
A new install shows "No series open" with two buttons but gives no context about what the app is or what to do. This is the first thing a beta tester sees.
- Add a brief welcome panel in the empty sidebar state: a short one-line description, the two existing buttons (New / Open), and a "Read the guide" link that opens the HelpTab.
- Detect first-run via a `tf-first-run` localStorage flag and auto-open the HelpTab on first launch.

### 9. Document Missing Features in HelpTab
Several features that exist are not mentioned in the Help content at all:
- **Spell check** — the editor has `spellCheck={true}` but Help never mentions it.
- **Context menu** — right-click with cut/copy/paste/AI actions, added this release.
- **Scene status** — Draft/Revised/Final and how to change it (right-click or Inspector).
- **Image embedding** — `[[img:...]]` syntax and drag-and-drop from the Assets panel.
- **Cross-chapter drag & drop** — now supported (removed from limitations, add to features).
- **Character / Location / Outline / Plot Grid panels** — exist in the sidebar but not documented.
- **Command palette** — Ctrl+K / Ctrl+P is mentioned but the full feature list is not.
- **Tweaks panel** — undocumented.
- **Undo/Redo** — now in Edit menu; note keyboard shortcuts.
- Update the **Known Limitations** section to reflect what's actually still limited.

### 10. Images in Exports
PDF and EPUB exporters explicitly skip `[[img:...]]` markers. For a writing app with image support, silently dropping images in exports will confuse users.
- **Minimum:** Replace skipped image markers with a placeholder note `[Image: filename]` so users know something was omitted rather than it silently disappearing.
- **Ideal:** Resolve image paths from the series `assets/` folder and embed them. EPUB already handles binary assets; PDF via QuestPDF can inline images.

### 11. Version Number Is Hardcoded in TitleBar
`TitleBar.tsx` shows a hardcoded `v0.1` string that will drift out of sync as versions change.
- Expose the assembly version via a lightweight API endpoint (e.g., `GET /api/workspace/version`) and load it from the frontend on startup, or inject it at build time via Vite's `define` using the version from `package.json`.

---

## 🟢 Polish — Do If Time Allows

### 12. Expand Explorer State Does Not Persist
The expanded/collapsed state of books and chapters in the sidebar resets every time the app restarts. For large manuscripts this is annoying.
- Persist expanded IDs to localStorage (keyed by series ID) in `ManuscriptSidebar`.

### 13. Ctrl+Shift+S in HelpTab Keyboard Reference
Once wired (task 1), make sure the HelpTab shortcut table shows Ctrl+Shift+S = Save All.

### 14. Open Tabs Do Not Restore After Restart
All editor tabs are lost when the app closes. Tabs aren't expected to persist across sessions in most editors, but it's worth noting — log this as a known limitation if not fixing.

### 15. PDF Export Has No Table of Contents
EPUB generates a proper `nav.xhtml` TOC. PDF has no TOC. For a multi-chapter manuscript this is a meaningful gap for readers.
- Add a TOC page to the PDF output listing chapters with page references, using QuestPDF's built-in section tracking.

### 16. Word Count Goal Tracking Is Not Historical
The daily writing goal in the bottom panel shows today's word count but doesn't track across sessions (resets if the app restarts). Note this as a known limitation or persist the baseline via localStorage.

### 17. Error Boundary Shows No Useful Info
`ErrorBoundary.tsx` catches render crashes and shows "Something went wrong" + Reload. In a beta, developers and testers need more.
- Display the error message and component stack in the error boundary UI (can be behind a collapsible "Details" toggle).

### 18. SmartScreen Warning
The installer is not code-signed. All first-time installers will see "Windows protected your PC". Document this prominently in the README, release notes, and the installer's welcome page so users aren't surprised.
- Consider a self-signed cert as a minimal improvement — it won't pass SmartScreen reputation but it at least shows a publisher name.
- Long-term: EV code signing certificate removes the warning entirely.

### 19. Spell Check Confirmation
The scene editor has `spellCheck={true}` which enables the browser's native spell check underlines. However, the default WebView2 context menu is disabled (`AreDefaultContextMenusEnabled = false`), so right-clicking a misspelled word doesn't offer corrections.
- Confirm that red underlines appear in the editor (they should via CSS `::spelling-error`).
- Consider surfacing spell check suggestions in the `EditorContextMenu` using the Web Spelling API if available, or document that underlines are visible but corrections must be typed manually.

---

## Reference — What Is Already Working Well

- ✅ Autosave (configurable interval, status bar feedback)
- ✅ Recent series list (up to 10, persisted to AppData)
- ✅ Word count at scene / chapter / book / total levels (bottom panel + status bar)
- ✅ All editor settings persist across restarts (theme, font, line height, panels)
- ✅ Auto-update check and one-click install
- ✅ AI assistant with streaming output
- ✅ Right-click context menu with clipboard and AI actions
- ✅ Undo/redo in all editable areas
- ✅ Find & Replace
- ✅ Version history / snapshots
- ✅ PDF and EPUB export (text content)
- ✅ Drag & drop scene reordering (including cross-chapter)
- ✅ Scene status (Draft / Revised / Final)
- ✅ Character / Location / Outline / Plot Grid management
- ✅ Image embedding in editor with asset panel
