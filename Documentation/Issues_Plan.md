# TextForge Studio — GitHub Issues Implementation Plan

**Generated:** May 2026  
**Branch:** v011  
**Issues:** #9, #10, #11, #12

---

## Summary

| # | Title | Priority | Effort | File(s) |
|---|-------|----------|--------|---------|
| [#9](#issue-9--ai-panel-context-menu) | AI panel context menu | High | Small (½ day) | `AiPanel.tsx` |
| [#10](#issue-10--checklist-editing--reordering) | Checklist edit & reorder | Medium–High | Medium (1 day) | `BottomPanel.tsx` |
| [#11](#issue-11--plot-grid-chapter-management) | Plot grid chapter management | Medium | Medium (1–2 days) | `PlotGridEditor.tsx` |
| [#12](#issue-12--rich-text-formatting-options) | Rich text formatting expansion | Low–Medium | Large (2–3 days) | `FormatBar.tsx`, `SceneEditor.tsx` |

---

## Issue #9 — AI Panel Context Menu

**Status:** Quick win. The AI output area renders markdown into a `div` that the browser treats as read-only text. Right-clicking shows no context menu because WebView2 has `AreDefaultContextMenusEnabled = false` (set in `MainWindow.xaml.cs`). The existing "Copy" button copies the full output, but users cannot copy a selected excerpt.

### Root cause
`CoreWebView2.Settings.AreDefaultContextMenusEnabled = false` suppresses the browser's built-in right-click menu globally so that the titlebar and custom chrome feel native. We need a custom context menu scoped to the AI output panel.

### Implementation

**`AiPanel.tsx`**

1. Add `onContextMenu` handler on the AI output container `<div>`.
2. On right-click, capture `window.getSelection().toString()` to get any selected text.
3. Render a `<ContextMenu>` (the generic one already in `components/ui/ContextMenu.tsx`) positioned at the mouse coordinates with two items:
   - **Copy selection** — `navigator.clipboard.writeText(selectedText)` — visible only when `selectedText` is non-empty.
   - **Copy all** — `navigator.clipboard.writeText(fullOutput)` — always visible.
4. Dismiss on outside click (same pattern as existing context menus in `ContextMenu.tsx`).

No backend changes required. No new dependencies.

### Acceptance criteria
- Right-clicking selected text in the AI output shows "Copy selection" and "Copy all".
- "Copy selection" is disabled / hidden when no text is selected.
- Menu dismisses on click-away or after an action.
- Existing full-output "Copy" button continues to work.

---

## Issue #10 — Checklist Editing & Reordering

**Status:** The Notes tab in `BottomPanel.tsx` persists items in `localStorage` under key `tf-notes`. Each item is `{ id, text, done }`. Currently: add (text input + Enter), toggle done, delete. Missing: edit existing text, reorder.

### Implementation

**`BottomPanel.tsx`** — Notes tab section

#### 1. Inline editing
- Add an `editingId: string | null` state.
- When a note row is double-clicked (or an edit icon is clicked), set `editingId = note.id` and render the row text as an `<input>` pre-filled with the current text.
- On `blur` or `Enter`, commit the change: update the item in the notes array and persist to localStorage.
- On `Escape`, cancel and revert to display mode.

#### 2. Reordering (move up / move down)
- Drag-and-drop adds a library dependency (`@dnd-kit` is common in this stack). Since the list is typically short and the project currently has no DnD library, implement simple **Move Up / Move Down** arrow buttons instead — lower risk, no new dependency.
- Each note row gets two small icon buttons (`↑` / `↓`). The up button is hidden on the first item; the down button is hidden on the last.
- On click, swap the item with its neighbour in the array and persist.

#### 3. State shape (no change to localStorage schema)
```ts
type Note = { id: string; text: string; done: boolean };
```
Order is preserved by array index — no `sortOrder` field needed.

### Acceptance criteria
- Double-clicking a note text puts it into an editable input field.
- Pressing Enter or clicking away commits the edit.
- Pressing Escape cancels without saving.
- Each note has ↑ / ↓ buttons that move it one position.
- Reordering does not affect the `done` state.
- All changes persist in localStorage across sessions.

---

## Issue #11 — Plot Grid Chapter Management

**Status:** `PlotGridEditor.tsx` manages a grid where **columns = plot lines** and **rows = chapters/scenes**. Row headers (chapter names) are editable inline via a `<textarea>`. The reported problems are:
1. Editing the row header is confusingly close to the delete button — accidental deletion risk.
2. Deleted and recreated rows append to the bottom — no way to insert at a position or reorder.

### Current data model (from `api/plotGrids.ts`)
```
PlotGrid → columns (plot lines, ordered) → rows (chapters, ordered) → cells
```
The API has endpoints for adding/removing rows and columns but no explicit reorder endpoint. `SortOrder` is stored on both columns and rows.

### Implementation

#### Part A — Safer row header editing
- Replace the current `<textarea>` row header (which sits adjacent to the delete button) with a read-only `<span>` that shows the chapter name.
- Double-clicking the span enters edit mode: renders an `<input>` in place.
- On `Enter` or blur, call `PUT /api/plot-grids/{id}/rows/{rowId}` with the new title.
- On `Escape`, cancel.
- Move the delete button (`✕`) to a hover-revealed icon on the **far right** of the row header, with a confirmation step (e.g. `window.confirm` or a small inline confirm/cancel pair) before firing.

#### Part B — Row reordering (move up / move down)
Same approach as Issue #10 — arrow buttons rather than drag-and-drop to avoid a library dependency.

- Add ↑ / ↓ buttons to each row header, visible on hover.
- On click: swap `sortOrder` values between the row and its neighbour, then call `PATCH /api/plot-grids/{id}/rows/{rowId}` with the new `sortOrder` (or a dedicated reorder endpoint if one exists — check `plotGrids.ts`).
- If no reorder endpoint exists, call the existing update endpoint twice (once per swapped row).
- Refresh local state optimistically; roll back on API error.

#### Part C — Insert row at position
- Change "Add Row" from appending to the end to **inserting after a selected row**.
- Add a faint `+ Add chapter` button that appears between rows on hover (small horizontal line with `+` icon, similar to common grid editors).
- On click, call `POST /api/plot-grids/{id}/rows` with a `sortOrder` value between the two adjacent rows (e.g. `(prevSortOrder + nextSortOrder) / 2`, or re-index all rows after insertion).

### API changes needed
- `PATCH /api/plot-grids/{gridId}/rows/{rowId}` — update `sortOrder` (if not already present).
- `POST /api/plot-grids/{gridId}/rows` — accept optional `insertAfterRowId` or `sortOrder` parameter.

Check `PlotGridsController.cs` before adding — the reorder PATCH may already exist.

### Acceptance criteria
- Chapter title is edited by double-clicking the name, not by interacting with the same element as delete.
- Pressing Escape during edit cancels without saving.
- Deleting a row requires a confirmation step before the API call is made.
- Rows can be moved up or down with arrow buttons.
- A new chapter can be inserted between existing chapters.
- Row order persists after save and reopen.
- All plot cell data remains attached to the correct row after reordering.

---

## Issue #12 — Rich Text Formatting Options

**Status:** `FormatBar.tsx` uses `document.execCommand()` calls on the `contenteditable` scene editor. The current toolbar: font selector (serif/sans/mono), bold, italic, underline, bulleted list, numbered list, table insert. `execCommand` natively supports most of the requested additions.

**Note:** `document.execCommand()` is deprecated in the web standard but remains fully functional in Chromium-based runtimes including WebView2. Since there is no plan to move away from WebView2 this is acceptable for now.

### Implementation

All changes are in `FormatBar.tsx` unless noted.

#### Group 1 — Text formatting (Small, add to existing toolbar row)

| Feature | `execCommand` call | Notes |
|---|---|---|
| Font size | `fontSize` with value 1–7 | Map point sizes to execCommand values: 12pt→3, 14pt→4, 18pt→5 |
| Text colour | `foreColor` with hex value | Render a `<input type="color">` hidden behind a swatch button |
| Highlight / marker | `backColor` with hex | Same pattern as text colour |
| Clear formatting | `removeFormat` | Single button, no parameter |

#### Group 2 — Paragraph alignment (New toolbar row or expandable section)

| Feature | `execCommand` call |
|---|---|
| Align left | `justifyLeft` |
| Align centre | `justifyCenter` |
| Align right | `justifyRight` |
| Justify | `justifyFull` |

#### Group 3 — Spacing (CSS-based, not execCommand)

`execCommand` does not support line or paragraph spacing. These require wrapping selected paragraphs in a `<div>` with a `style` attribute, or injecting a `<style>` block. This is more invasive and has the highest implementation cost of the group.

**Recommended approach:** Defer line/paragraph spacing to a follow-up. Focus Group 1 and Group 2 first as they are pure execCommand and low-risk.

If spacing is required now: implement a "Line spacing" dropdown that calls a helper which wraps the current block element(s) in a styled `<p>` or `<div>`.

#### Group 4 — Default font settings (Settings integration)

`SettingsModal.tsx` already has an Editor section. Add a "Default font" and "Default font size" picker there. On scene load in `useSceneEditor.ts` / `SceneEditor.tsx`, apply those defaults to new content via `document.execCommand('fontName', ...)` and `document.execCommand('fontSize', ...)` before the user types.

#### Toolbar layout changes

The current `FormatBar` is a single horizontal row. Adding 8+ new controls will overflow. Proposed layout:

```
Row 1: [Font▾] [Size▾] | [B] [I] [U] | [A▾ colour] [H▾ highlight] [✕ clear] | [≡] [⁼] [⁶⁷] | [⊟ table]
Row 2 (collapsible or always visible): [← ⟵ → →| align] | [line spacing▾]
```

Or: keep one row and put the new controls behind an "..." overflow / "More formatting" toggle button to preserve the current compact look.

#### Persistence note

`execCommand` embeds formatting as inline HTML in the `contenteditable` div. This HTML is already what gets saved to the scene `.md` file (as raw HTML, not Markdown). Formatting will therefore persist automatically — no storage changes required.

### Acceptance criteria
- Users can change font size without changing font family.
- Users can apply a custom text colour via a colour picker.
- Users can highlight selected text with a background colour.
- Users can apply left / centre / right / justified alignment.
- Users can remove all inline formatting from a selection.
- Formatting is preserved after save and reopen.
- The toolbar does not overflow its container at 1280px window width.

---

## Recommended Implementation Order

1. **#9 AI context menu** — smallest scope, immediate user-visible value, no API changes.
2. **#10 Checklist edit/reorder** — self-contained in one component, no API changes.
3. **#11 Plot grid management** — needs API changes but well-scoped; fix the accidental-delete issue first (Part A), then reorder (Part B), then insert-at-position (Part C).
4. **#12 Rich text formatting** — largest scope; implement Group 1 + Group 2 first, defer spacing.

---

*Internal planning document — TextForge Studio*
