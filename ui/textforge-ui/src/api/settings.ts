import { get, put } from './client';

export interface RecentSeriesEntry {
  title: string;
  path: string;
}

export const getRecentSeries = (): Promise<RecentSeriesEntry[]> =>
  get('/api/settings/recent-series');

export interface DailyProgress {
  date: string;
  written: number;
}

export interface UiPreferences {
  theme: string;
  typewriterMode: boolean;
  inspectorOpen: boolean;
  minimapOpen: boolean;
  bottomOpen: boolean;
  editorFont: string;
  fontSize: number;
  lineHeight: number;
  paragraphIndent: number;
  autosaveInterval: number;
  dailyGoal: number;
  projectGoal: number;
  dailyProgress: DailyProgress | null;
  lastSeriesPath: string | null;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  theme: 'dark',
  typewriterMode: false,
  inspectorOpen: true,
  minimapOpen: false,
  bottomOpen: false,
  editorFont: 'serif',
  fontSize: 17,
  lineHeight: 1.7,
  paragraphIndent: 0,
  autosaveInterval: 15,
  dailyGoal: 0,
  projectGoal: 0,
  dailyProgress: null,
  lastSeriesPath: null,
};

export const getUiPreferences = (): Promise<UiPreferences> =>
  get('/api/settings/ui-preferences');

export const setUiPreferences = (prefs: UiPreferences): Promise<void> =>
  put('/api/settings/ui-preferences', prefs);
