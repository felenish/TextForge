import React, { forwardRef, useImperativeHandle } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLayout } from '../src/components/layout/AppLayout';

const setSeriesMock = vi.fn();
const openSeriesFromPathMock = vi.fn(async () => undefined);
const openLogFolderMock = vi.fn(async () => undefined);
const postMessageMock = vi.fn();
const addEventListenerMock = vi.fn();
const removeEventListenerMock = vi.fn();
const logInfoMock = vi.fn();

vi.mock('../src/contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    seriesTitle: null,
    dirtySceneIds: new Set<string>(),
    typewriterMode: false,
    inspectorOpen: false,
    setSeries: setSeriesMock,
    totalWordCount: 0,
  }),
}));

vi.mock('../src/hooks/useEditorSettings', () => ({
  useEditorSettings: () => ({ autosaveInterval: 0 }),
}));

vi.mock('../src/hooks/useWordCountGoal', () => ({
  useWordCountGoal: () => ({
    dailyGoal: 0,
    dailyWritten: 0,
    projectGoal: 0,
  }),
}));

vi.mock('../src/hooks/useSeriesExplorer', () => ({
  useSeriesExplorer: () => ({
    series: null,
    loading: false,
    error: null,
    networkError: false,
    clearNetworkError: vi.fn(),
    characters: [],
    charactersLoaded: true,
    createSeries: vi.fn(async () => undefined),
    openSeries: vi.fn(async () => undefined),
    openSeriesFromPath: openSeriesFromPathMock,
    closeSeries: vi.fn(async () => undefined),
    addBook: vi.fn(async () => undefined),
    renameBook: vi.fn(async () => undefined),
    deleteBook: vi.fn(async () => undefined),
    reorderBooks: vi.fn(),
    addChapter: vi.fn(async () => undefined),
    renameChapter: vi.fn(async () => undefined),
    deleteChapter: vi.fn(async () => undefined),
    reorderChapters: vi.fn(),
    addScene: vi.fn(async () => undefined),
    renameScene: vi.fn(async () => undefined),
    deleteScene: vi.fn(async () => undefined),
    reorderScenes: vi.fn(),
    moveScene: vi.fn(),
    loadCharacters: vi.fn(async () => undefined),
    addCharacter: vi.fn(async () => undefined),
    renameCharacter: vi.fn(async () => undefined),
    deleteCharacter: vi.fn(async () => undefined),
    patchCharacterInList: vi.fn(),
    locations: [],
    locationsLoaded: true,
    loadLocations: vi.fn(async () => undefined),
    addLocation: vi.fn(async () => undefined),
    renameLocation: vi.fn(async () => undefined),
    deleteLocation: vi.fn(async () => undefined),
    patchLocationInList: vi.fn(),
    outlines: [],
    outlinesLoaded: true,
    loadOutlines: vi.fn(async () => undefined),
    addOutline: vi.fn(async () => undefined),
    renameOutline: vi.fn(async () => undefined),
    deleteOutline: vi.fn(async () => undefined),
    patchOutlineInList: vi.fn(),
    plotGrids: [],
    plotGridsLoaded: true,
    loadPlotGrids: vi.fn(async () => undefined),
    addPlotGrid: vi.fn(async () => undefined),
    renamePlotGrid: vi.fn(async () => undefined),
    deletePlotGrid: vi.fn(async () => undefined),
    patchPlotGridInList: vi.fn(),
  }),
}));

vi.mock('../src/lib/webview', () => ({
  getWebView: () => ({
    postMessage: postMessageMock,
    addEventListener: addEventListenerMock,
    removeEventListener: removeEventListenerMock,
  }),
  requestUpdate: vi.fn(),
}));

vi.mock('../src/lib/logger', () => ({
  logInfo: (message: string) => logInfoMock(message),
}));

vi.mock('../src/api/shell', () => ({
  openLogFolder: () => openLogFolderMock(),
}));

vi.mock('../src/components/layout/Shell', () => ({
  Shell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));

vi.mock('../src/components/layout/ShellBody', () => ({
  ShellBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../src/components/layout/TitleBar', () => ({
  TitleBar: () => <div />,
}));

vi.mock('../src/components/layout/MenuBar', () => ({
  MenuBar: ({ onOpenLogFolder }: { onOpenLogFolder: () => void }) => (
    <button type="button" onClick={onOpenLogFolder}>Open Log Folder</button>
  ),
}));

vi.mock('../src/components/layout/StatusBar', () => ({
  StatusBar: () => <div />,
}));

vi.mock('../src/components/layout/ActivityBar', () => ({
  ActivityBar: () => <div />,
}));

vi.mock('../src/components/layout/Sidebar', () => ({
  Sidebar: () => <div />,
}));

vi.mock('../src/components/panels/RightPanel', () => ({
  RightPanel: () => <div />,
}));

vi.mock('../src/components/panels/BottomPanel', () => ({
  BottomPanel: () => <div />,
}));

vi.mock('../src/components/ui/CommandPalette', () => ({
  CommandPalette: () => <div />,
}));

vi.mock('../src/components/ui/TweaksPanel', () => ({
  TweaksPanel: () => <div />,
}));

vi.mock('../src/components/settings/SettingsModal', () => ({
  SettingsModal: () => <div />,
}));

vi.mock('../src/components/export/ExportModal', () => ({
  ExportModal: () => <div />,
}));

vi.mock('../src/components/versions/TakeSnapshotModal', () => ({
  TakeSnapshotModal: () => <div />,
}));

vi.mock('../src/components/ui/UpdateBanner', () => ({
  UpdateBanner: () => <div />,
}));

vi.mock('../src/components/ui/BackendBanner', () => ({
  BackendBanner: () => <div />,
}));

vi.mock('../src/components/ui/AboutModal', () => ({
  AboutModal: () => <div />,
}));

vi.mock('../src/components/ui/EditorContextMenu', () => ({
  EditorContextMenu: () => <div />,
}));

vi.mock('../src/components/editor/SceneEditorArea', () => ({
  SceneEditorArea: forwardRef(function MockSceneEditorArea(_props: unknown, ref) {
    useImperativeHandle(ref, () => ({
      saveAll: vi.fn(async () => undefined),
      saveActive: vi.fn(async () => undefined),
      openScene: vi.fn(),
      openCharacter: vi.fn(),
      openLocation: vi.fn(),
      openOutline: vi.fn(),
      openPlotGrid: vi.fn(),
      openHelp: vi.fn(),
      openFind: vi.fn(),
      closeAll: vi.fn(),
    }));

    return <div data-testid="scene-editor" />;
  }),
}));

describe('AppLayout startup instrumentation', () => {
  beforeEach(() => {
    setSeriesMock.mockReset();
    openSeriesFromPathMock.mockReset();
    openLogFolderMock.mockReset();
    postMessageMock.mockReset();
    addEventListenerMock.mockReset();
    removeEventListenerMock.mockReset();
    logInfoMock.mockReset();

    localStorage.clear();
    localStorage.setItem('tf-last-series', 'C:/demo/series.tfseries');
    localStorage.setItem('tf-first-run', '1');

    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
      {
        domContentLoadedEventEnd: 20,
        loadEventEnd: 35,
        responseEnd: 12,
      } as PerformanceNavigationTiming,
    ] as PerformanceEntry[]);
  });

  it('posts app-ready, logs startup timings, and opens log folder from menu command', async () => {
    render(<AppLayout />);

    await waitFor(() => {
      expect(postMessageMock).toHaveBeenCalledWith('app-ready');
    });

    expect(openSeriesFromPathMock).toHaveBeenCalledWith('C:/demo/series.tfseries');

    const messages = logInfoMock.mock.calls.map(call => String(call[0]));
    expect(messages.some(m => m.includes('[perf] app_ready_post_message'))).toBe(true);
    expect(messages.some(m => m.includes('[perf] navigation'))).toBe(true);
    expect(messages.some(m => m.includes('[perf] auto_open_complete'))).toBe(true);
    expect(messages.some(m => m.includes('[perf] startup_settled'))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Open Log Folder' }));
    await waitFor(() => {
      expect(openLogFolderMock).toHaveBeenCalled();
    });
  });
});
