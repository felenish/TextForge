# TextForge Studio — AI-Assisted Design Document

## Purpose

This document is intended to inform GitHub Copilot, AI coding agents, and future contributors about the architecture, philosophy, structure, and intended workflows of the TextForge Studio application.

The document should be treated as the high-level source of truth for the application design.

It describes the desired application concept, architectural boundaries, MVP scope, future expansion points, and coding expectations.

---

# 1. Project Vision

TextForge Studio is a desktop-first writing IDE for novelists and long-form fiction writers.

The application combines:

- Manuscript organization
- Dockable IDE-style workflows
- Structured worldbuilding
- Local-first project storage
- Source-control-inspired versioning
- Export tooling
- Multi-document editing

The application should feel conceptually similar to Visual Studio, JetBrains Rider, or VS Code, but focused entirely on creative writing workflows instead of software development.

Writers should be able to:

- Organize books into chapters and scenes
- Open multiple scenes simultaneously
- Rearrange manuscript structure visually
- Manage writing assets
- Maintain portable local projects
- Experiment safely with alternate story branches
- Export polished manuscripts

The project prioritizes:

- Offline-first functionality
- Long-term project stability
- Human-readable storage
- Performance with large books
- Extensibility
- Strong separation of concerns
- Writer-focused usability

---

# 2. High-Level Application Concept

TextForge Studio is fundamentally a structured workspace editor.

A book is treated similarly to a software solution.

A book project contains chapters, scenes, notes, characters, locations, timelines, assets, and version history.

Example:

```text
Book Project
 ├── Manuscript
 │    ├── Chapter 01
 │    │    ├── Scene 01
 │    │    └── Scene 02
 │    └── Chapter 02
 │         └── Scene 01
 ├── Characters
 ├── Locations
 ├── Notes
 ├── Timelines
 ├── Assets
 └── Version History
```

Every major object should exist as a real file on disk.

This is intentionally different from a monolithic database-only design.

The application should remain transparent and recoverable. A user should be able to inspect their book folder outside the application and understand the basic project structure.

---

# 3. Core Design Principles

## 3.1 Local-First

The application must work fully offline.

No cloud dependency should exist for core functionality.

All data belongs to the user and is stored locally.

Cloud sync, collaboration, and AI features may be added later, but they must be optional.

---

## 3.2 Portable Projects

A book project should be:

- Copyable
- Backup friendly
- Git friendly
- Human inspectable
- Easy to zip or share
- Recoverable without special server infrastructure

Projects should remain usable even if the application no longer exists.

---

## 3.3 File-Based Architecture

Scenes are individual files.

Books are folders.

Metadata is stored in JSON manifests.

This allows:

- Easier versioning
- Easier recovery
- Easier debugging
- Easier external tooling
- Easier future import/export
- Easier manual repair if something goes wrong

SQLite may be introduced later for indexing, search, or caching, but the file system should remain the source of truth.

---

## 3.4 UI Should Not Own Business Logic

The UI layer should remain thin.

Business rules belong in:

- Core domain services
- Storage services
- Application services

ViewModels coordinate behavior.

Views display state.

Views should not directly perform storage operations or manipulate raw project files.

---

## 3.5 Extensibility

The architecture should support future systems:

- Source control
- Plugins
- AI tools
- Cloud sync
- Collaboration
- Rich editors
- Custom export pipelines
- Additional worldbuilding object types

The MVP should not hardcode assumptions that prevent future expansion.

---

# 4. Technology Stack

## 4.1 Language

C# / .NET 10

---

## 4.2 UI Framework

Avalonia

Reasoning:

- Cross-platform desktop support
- XAML workflows familiar to WPF developers
- MVVM friendly
- Modern rendering stack
- Docking support possible
- Suitable for a native desktop writing application

---

## 4.3 Architectural Pattern

MVVM

Recommended libraries:

- CommunityToolkit.Mvvm
- ObservableObject
- RelayCommand / AsyncRelayCommand
- WeakReferenceMessenger if messaging is needed

---

## 4.4 Serialization

System.Text.Json

Requirements:

- Use stable JSON formats
- Version manifest files
- Preserve compatibility where practical
- Avoid serializing view model objects directly

---

## 4.5 Storage

Filesystem-first architecture.

The filesystem remains the source of truth.

SQLite may be introduced later for:

- Search indexes
- Cached word counts
- Recently opened project metadata
- Derived analytics
- Full-text search

SQLite should not replace the project folder as the canonical storage model unless a future design decision explicitly changes that direction.

---

# 5. Solution Structure

Recommended solution structure:

```text
TextForge.sln
 ├── src/
 │    ├── TextForge.Core/
 │    ├── TextForge.Storage/
 │    ├── TextForge.Versioning/
 │    ├── TextForge.Export/
 │    ├── TextForge.App/
 │    └── TextForge.App.Desktop/
 └── tests/
      ├── TextForge.Core.Tests/
      ├── TextForge.Storage.Tests/
      ├── TextForge.Versioning.Tests/
      └── TextForge.App.Tests/
```

For the MVP, `TextForge.Versioning` and `TextForge.Export` may exist as placeholder projects or may be deferred. The architecture should still account for them.

---

# 6. Project Responsibilities

## 6.1 TextForge.Core

Contains pure domain logic and models.

Must not reference Avalonia.

Contains:

- BookProject
- Chapter
- Scene
- Domain enums
- Domain interfaces
- Validation primitives
- Shared abstractions
- Domain result types if needed

No UI code belongs here.

No file picker or Avalonia types belong here.

Example classes:

```csharp
public sealed class BookProject
{
    public Guid Id { get; init; }
    public string Title { get; set; } = string.Empty;
    public string RootPath { get; set; } = string.Empty;
    public List<Chapter> Chapters { get; } = new();
    public DateTimeOffset CreatedUtc { get; init; }
    public DateTimeOffset ModifiedUtc { get; set; }
}
```

```csharp
public sealed class Chapter
{
    public Guid Id { get; init; }
    public string Title { get; set; } = string.Empty;
    public string FolderPath { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public List<Scene> Scenes { get; } = new();
}
```

```csharp
public sealed class Scene
{
    public Guid Id { get; init; }
    public string Title { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public string Content { get; set; } = string.Empty;
}
```

---

## 6.2 TextForge.Storage

Responsible for reading and writing projects to disk.

Contains:

- Manifest loading
- Manifest saving
- Scene loading
- Scene saving
- File path generation
- JSON serialization
- Folder creation
- Safe file writes
- Project validation

Must remain UI independent.

Expected service examples:

```csharp
public interface IBookStorageService
{
    Task<BookProject> CreateBookAsync(CreateBookRequest request, CancellationToken cancellationToken = default);
    Task<BookProject> OpenBookAsync(string bookFilePath, CancellationToken cancellationToken = default);
    Task SaveBookAsync(BookProject book, CancellationToken cancellationToken = default);
}
```

```csharp
public interface ISceneFileService
{
    Task<string> LoadSceneContentAsync(Scene scene, CancellationToken cancellationToken = default);
    Task SaveSceneContentAsync(Scene scene, string content, CancellationToken cancellationToken = default);
}
```

---

## 6.3 TextForge.Versioning

Future Git-inspired local versioning engine.

Responsible for:

- Commits
- Branches
- Merges
- Snapshots
- History
- Diffing
- Restore operations

This should behave similarly to a lightweight Git implementation specialized for writing projects.

Unlike Git, it should prioritize writer usability. The user should not need terminal knowledge.

Possible concepts:

```text
.textforge/
 ├── HEAD
 ├── refs/
 │    └── branches/
 │         ├── main
 │         └── alternate-ending
 ├── objects/
 │    ├── blobs/
 │    ├── trees/
 │    └── commits/
 └── index
```

MVP does not need this implemented, but storage and domain design should avoid blocking it.

---

## 6.4 TextForge.Export

Future export system.

Responsible for:

- PDF export
- EPUB export
- Table of contents generation
- Cover handling
- Asset inclusion
- Front matter
- Chapter ordering
- Formatting themes

Export logic should not depend on the UI.

The UI should collect export options and call application/export services.

---

## 6.5 TextForge.App

Contains application-level orchestration.

Responsible for:

- Workspace management
- Document management
- Commands
- ViewModels
- Services
- Dock management state
- Dirty-state tracking
- Application workflows

This layer coordinates between UI and infrastructure.

Example services:

```csharp
public interface IBookWorkspaceService
{
    BookProject? CurrentBook { get; }
    Task CreateBookAsync(CreateBookRequest request);
    Task OpenBookAsync(string path);
    Task SaveAsync();
    Task CloseAsync();
}
```

```csharp
public interface IDocumentService
{
    IReadOnlyList<DocumentViewModel> OpenDocuments { get; }
    DocumentViewModel? ActiveDocument { get; }
    Task OpenSceneAsync(Scene scene);
    Task CloseDocumentAsync(DocumentViewModel document);
}
```

---

## 6.6 TextForge.App.Desktop

Avalonia startup project.

Responsible for:

- App bootstrap
- Main window
- Styles
- Themes
- Platform initialization
- Desktop integrations
- File picker implementation
- Dialog implementation

---

# 7. MVP Scope

The MVP intentionally focuses only on the manuscript workflow.

## Included

- Book creation
- Book loading
- Book explorer
- Chapter management
- Scene management
- Docked document tabs
- Simple text editor
- Save/load workflow
- File persistence
- Dirty-state tracking

## Excluded

- Source control
- Branching
- Merging
- Rich text editing
- AI features
- Export system
- Character dossiers
- Notes
- Locations
- Timelines
- Collaboration
- Cloud sync

The goal is to create a stable manuscript foundation before expanding.

---

# 8. Book Project Structure

Example project folder:

```text
MyNovel/
 ├── book.tfbook
 ├── manuscript/
 │    ├── chapter-001/
 │    │    ├── chapter.json
 │    │    ├── scene-001.md
 │    │    └── scene-002.md
 │    └── chapter-002/
 │         ├── chapter.json
 │         └── scene-001.md
 ├── assets/
 └── .textforge/
```

For MVP, only the following are required:

```text
MyNovel/
 ├── book.tfbook
 └── manuscript/
      └── chapter-001/
           └── scene-001.md
```

---

# 9. Manifest Philosophy

The manifest controls ordering and metadata.

Scenes remain independent files.

This allows:

- Reordering without moving files
- Future branching support
- Easier versioning
- Safer recovery
- Easier export generation

Example `book.tfbook`:

```json
{
  "version": 1,
  "id": "00000000-0000-0000-0000-000000000000",
  "title": "My Novel",
  "createdUtc": "2026-05-09T00:00:00Z",
  "modifiedUtc": "2026-05-09T00:00:00Z",
  "chapters": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "title": "Chapter One",
      "folder": "manuscript/chapter-001",
      "sortOrder": 1,
      "scenes": [
        {
          "id": "22222222-2222-2222-2222-222222222222",
          "title": "Opening Scene",
          "file": "manuscript/chapter-001/scene-001.md",
          "sortOrder": 1
        }
      ]
    }
  ]
}
```

The manifest should be versioned from the beginning.

---

# 10. Core Domain Models

## 10.1 BookProject

Represents the active book workspace.

Properties:

- Id
- Title
- RootPath
- Chapters
- CreatedUtc
- ModifiedUtc

Responsibilities:

- Own chapter list
- Represent book-level metadata
- Provide access to manuscript structure

---

## 10.2 Chapter

Represents a logical grouping of scenes.

Properties:

- Id
- Title
- FolderPath
- SortOrder
- Scenes

Responsibilities:

- Own scene list
- Preserve scene order
- Store chapter metadata

---

## 10.3 Scene

Represents a single editable writing document.

Properties:

- Id
- Title
- FilePath
- Content
- SortOrder

Responsibilities:

- Represent one writing file
- Store metadata needed for ordering and display
- Provide content for editor workflows

---

# 11. UI Philosophy

The UI should feel similar to a modern IDE.

The application should prioritize:

- Minimal friction
- Multi-document workflows
- Fast navigation
- Keyboard-friendly interactions
- Stable layouts
- Clear project organization
- Writer-friendly defaults

The MVP should not chase complex UI polish before the basic book/chapter/scene workflow works.

---

# 12. Main Layout

Target layout:

```text
┌──────────────────────────────────────────────┐
│ Menu / Toolbar                               │
├───────────────┬──────────────────────────────┤
│ Book Explorer │ Main Editor Area             │
│               │ Docked Scene Documents       │
├───────────────┴──────────────────────────────┤
│ Status / Output / Notifications              │
└──────────────────────────────────────────────┘
```

Future layout:

```text
┌──────────────────────────────────────────────┐
│ Menu / Toolbar                               │
├───────────────┬───────────────────┬──────────┤
│ Book Explorer │ Main Editor Area  │ Inspector│
│               │ Docked Documents  │ Metadata │
├───────────────┴───────────────────┴──────────┤
│ Output / Search / Version Control            │
└──────────────────────────────────────────────┘
```

---

# 13. Book Explorer

The Book Explorer is analogous to Solution Explorer.

It should display hierarchical project content.

Initial MVP hierarchy:

```text
Book
 ├── Chapter
 │    ├── Scene
 │    └── Scene
```

Future hierarchy:

```text
Book
 ├── Manuscript
 ├── Characters
 ├── Locations
 ├── Timelines
 ├── Notes
 ├── Assets
 └── History
```

## MVP Interactions

- Double-click scene to open editor
- Right-click book to add chapter
- Right-click chapter to add scene
- Right-click chapter to rename/delete
- Right-click scene to rename/delete
- Refresh tree after changes

Drag/drop ordering can be deferred until after MVP.

---

# 14. Document System

Scenes open as tabs in the document workspace.

Requirements:

- Multiple open documents
- Track active document
- Dirty-state indicators
- Prevent duplicate tabs
- Closable tabs
- Save support

A scene should not open twice. If the user opens an already-open scene, activate the existing document tab.

Example tab names:

```text
Opening Scene
* Opening Scene
```

The asterisk indicates unsaved changes.

---

# 15. Scene Editor

The MVP editor can be simple.

Requirements:

- Multiline text editor
- Plain text or Markdown editing
- Bind editor content to SceneEditorViewModel
- Track dirty state
- Save scene content to `.md` file
- Show scene title
- Support Ctrl+S

Optional MVP additions:

- Word count
- Line count
- Current file path display

Future additions:

- Markdown preview
- Rich text editing
- Focus mode
- Typewriter mode
- Split view
- Revision annotations

---

# 16. Docking Philosophy

The docking system should eventually behave similarly to:

- Visual Studio
- JetBrains Rider
- VS Code

However, the MVP should prioritize stability over advanced layout features.

MVP docking requirements:

- Book Explorer docked left
- Editor tabs in center
- Tabs closeable
- Layout stable during runtime

Deferred:

- Persist custom layouts
- Floating tool windows
- Auto-hide panels
- Complex drag/drop docking

---

# 17. Save Workflow

Save operations should:

1. Save scene files.
2. Save manifest changes.
3. Update modified timestamps.
4. Preserve ordering.
5. Avoid corrupting files on failure.

Safe-write patterns are encouraged.

Example safe write:

1. Write to temporary file.
2. Flush file.
3. Replace target file.
4. Delete temp file.

---

# 18. Dirty State

Dirty state should be tracked at document level and workspace level.

A scene is dirty when editor content differs from the last saved content.

The workspace is dirty when:

- A scene is dirty
- Chapter structure changed
- Scene structure changed
- Metadata changed

On application close, prompt if dirty state exists.

---

# 19. Application Commands

MVP commands:

- New Book
- Open Book
- Save
- Save All
- Close Book
- Add Chapter
- Rename Chapter
- Delete Chapter
- Add Scene
- Rename Scene
- Delete Scene
- Open Scene
- Close Scene Tab
- Exit

Commands should generally live on ViewModels and delegate real work to services.

---

# 20. Dialogs

MVP dialogs:

- New Book dialog
- Add Chapter dialog
- Rename Chapter dialog
- Add Scene dialog
- Rename Scene dialog
- Delete confirmation dialog
- Unsaved changes dialog
- Error dialog

Dialog implementation should be abstracted behind an interface so ViewModels are not tightly coupled to Avalonia windows.

Example:

```csharp
public interface IDialogService
{
    Task<CreateBookRequest?> ShowCreateBookDialogAsync();
    Task<string?> ShowTextInputDialogAsync(string title, string prompt, string initialValue = "");
    Task<bool> ShowConfirmationDialogAsync(string title, string message);
    Task ShowErrorAsync(string title, string message);
}
```

---

# 21. Storage Rules

## 21.1 File Naming

Use safe file names.

Scene and chapter titles should not directly become unsafe paths.

Example:

```text
Chapter Title: The Storm Arrives
Folder: chapter-001-the-storm-arrives
```

If duplicate names exist, append a number.

```text
scene-001-opening.md
scene-002-opening.md
```

## 21.2 IDs

Use GUIDs for stable identity.

Names and paths may change.

IDs should not change when renaming.

## 21.3 Ordering

Use `SortOrder` in the manifest.

Do not rely only on alphabetical file order.

---

# 22. Error Handling

The application should handle:

- Missing manifest
- Invalid JSON
- Missing scene files
- Unauthorized file access
- Locked files
- Invalid paths
- Failed save operations

Errors should be user-friendly.

Internal exceptions should be logged.

---

# 23. Testing Strategy

## 23.1 Core Tests

Test:

- Model creation
- Validation rules
- Ordering behavior
- Rename behavior
- ID stability

## 23.2 Storage Tests

Test:

- Create book
- Save manifest
- Load manifest
- Add chapter
- Add scene
- Save scene content
- Load scene content
- Preserve chapter order
- Preserve scene order
- Handle missing files
- Handle invalid manifests

## 23.3 App Tests

Test:

- ViewModel command behavior
- Dirty-state tracking
- Document open behavior
- Prevent duplicate tabs
- Save command behavior

---

# 24. Future Versioning System

TextForge intends to implement a local versioning system inspired by Git.

Concepts:

- Commits
- Branches
- Merges
- Alternate story paths
- Snapshots
- Restore points
- Diffs

Unlike Git, the system should prioritize writer usability.

The user should not need terminal knowledge.

Example workflows:

- "Save snapshot before rewriting chapter 12"
- "Create alternate ending branch"
- "Compare this version against yesterday's draft"
- "Restore this scene from a previous version"
- "Merge alternate ending into main draft"

---

# 25. Future Export System

Future export workflows should support:

- PDF
- EPUB
- Cover images
- Maps/images
- Table of contents
- Chapter ordering
- Front matter
- Formatting themes

Export should operate from the manifest structure.

The export wizard should guide the user through:

1. Select content.
2. Confirm order.
3. Configure front matter.
4. Add cover/images.
5. Configure formatting.
6. Generate output.

---

# 26. Future Worldbuilding System

Future worldbuilding sections may include:

- Characters
- Locations
- Organizations
- Magic systems
- Timelines
- Notes
- Research
- Glossary entries
- Species/races
- Cultures
- Plot threads

These should follow the same project philosophy:

- Each item is a structured object
- Each item can be stored as a file
- Each item can be linked to scenes
- Each item can eventually participate in versioning

---

# 27. AI Integration Philosophy

AI systems should assist the writer, not replace them.

Potential future features:

- Rewrite suggestions
- Continuity analysis
- Character consistency checks
- Plot summaries
- Tone analysis
- Scene brainstorming
- Research organization
- Worldbuilding consistency checks
- "What changed since last draft?" summaries

AI systems must remain optional.

The core application must remain useful without AI.

---

# 28. Coding Standards

## 28.1 General

- Prefer composition over inheritance.
- Avoid god classes.
- Keep ViewModels focused.
- Avoid business logic in Views.
- Prefer async APIs where appropriate.
- Use immutable models where practical.
- Keep storage logic out of UI projects.
- Keep domain logic out of Avalonia views.

---

## 28.2 Naming

Use clear descriptive names.

Avoid abbreviations.

Avoid Hungarian notation.

Good:

```csharp
BookWorkspaceService
SceneEditorViewModel
BookExplorerViewModel
```

Bad:

```csharp
BkWrkSvc
SEVM
BEVM
```

---

## 28.3 MVVM

Views should:

- Contain layout
- Bind to ViewModels
- Avoid business logic

ViewModels should:

- Expose state
- Expose commands
- Coordinate services
- Avoid direct file IO where practical

Services should:

- Perform application logic
- Remain UI independent where possible

---

# 29. Performance Considerations

The application should eventually support:

- Large novels
- Hundreds of scenes
- Thousands of notes
- Large worldbuilding databases
- Many open editor tabs

Avoid loading unnecessary content eagerly.

Prefer lazy-loading scene content where practical.

Potential strategy:

- Load manifest at project open
- Load scene content only when scene opens
- Save only dirty scenes
- Cache derived data separately

---

# 30. Accessibility and Usability

The application should eventually support:

- Keyboard navigation
- Theme support
- Font size preferences
- High-contrast-friendly layouts
- Clear focus states
- Predictable save behavior
- Non-destructive delete confirmations

Writing software must feel safe. Users should trust that their work will not disappear.

---

# 31. Non-Goals for MVP

The MVP is not attempting to:

- Compete with Word processors
- Replace Scrivener immediately
- Implement collaborative editing
- Implement cloud infrastructure
- Build a full wiki engine
- Build a rich publishing suite
- Implement source control immediately
- Implement export immediately

The MVP only needs to prove the manuscript workflow.

---

# 32. MVP Acceptance Criteria

The MVP is successful when:

1. A user can create a new book project.
2. The app creates the correct folder structure.
3. The book appears in the Book Explorer.
4. The user can add chapters.
5. The user can add scenes to chapters.
6. The user can open a scene in a docked editor tab.
7. The user can edit scene text.
8. The user can save the project.
9. The user can close and reopen the project.
10. Chapters, scenes, order, titles, and text content are preserved.

---

# 33. Recommended Build Order

1. Create solution structure.
2. Create domain models.
3. Create manifest models.
4. Create storage service.
5. Add storage unit tests.
6. Create Avalonia shell.
7. Add dock layout.
8. Add Book Explorer.
9. Add scene editor tabs.
10. Wire commands.
11. Add save/load workflow.
12. Add dirty-state tracking.
13. Polish MVP workflow.

---

# 34. Long-Term Vision

Long-term, TextForge Studio should become:

- A full writing IDE
- A structured storytelling workspace
- A local-first authoring platform
- A version-controlled manuscript system
- A worldbuilding toolkit
- A publishing/export pipeline
- An extensible desktop ecosystem

The project should remain fundamentally writer-focused and offline-first.

---

# 35. Guidance for GitHub Copilot and Coding Agents

When generating code for this project:

1. Keep UI code out of Core.
2. Keep storage code out of Views.
3. Prefer interfaces for app services.
4. Use async file IO where practical.
5. Use clear, explicit class names.
6. Preserve the file-based project philosophy.
7. Do not introduce a database as the source of truth without an explicit design change.
8. Do not implement future systems before MVP foundations are stable.
9. Make code testable.
10. Keep the MVP focused on books, chapters, scenes, docked editor tabs, and save/load.

When in doubt, favor simple, maintainable, local-first design.
