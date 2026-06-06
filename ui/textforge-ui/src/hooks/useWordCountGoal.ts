import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export interface WordCountGoal {
  dailyGoal: number;
  projectGoal: number;
  dailyWritten: number;
  setDailyGoal: (v: number) => void;
  setProjectGoal: (v: number) => void;
  resetDailyProgress: () => void;
}

export function useWordCountGoal(totalWordCount: number): WordCountGoal {
  const { loadedPrefs, savePrefs } = useWorkspace();

  // User-driven overrides; null = use loaded value
  const [dailyGoalOverride, setDailyGoalOverride] = useState<number | null>(null);
  const [projectGoalOverride, setProjectGoalOverride] = useState<number | null>(null);
  const [dailyWrittenOverride, setDailyWrittenOverride] = useState<number | null>(null);

  const dailyGoal = dailyGoalOverride ?? loadedPrefs?.dailyGoal ?? 0;
  const projectGoal = projectGoalOverride ?? loadedPrefs?.projectGoal ?? 0;

  // Resolve the initial dailyWritten from loaded prefs (resets if the date differs)
  const loadedDailyWritten = (() => {
    const p = loadedPrefs?.dailyProgress;
    return p?.date === todayStr() ? p.written : 0;
  })();
  const dailyWritten = dailyWrittenOverride ?? loadedDailyWritten;

  const prevTotalRef = useRef<number>(totalWordCount);
  const initialised = useRef(false);

  useEffect(() => {
    // Skip the first render — don't count the initial load as writing.
    if (!initialised.current) {
      initialised.current = true;
      prevTotalRef.current = totalWordCount;
      return;
    }
    const delta = totalWordCount - prevTotalRef.current;
    prevTotalRef.current = totalWordCount;
    if (delta <= 0) return;

    const today = todayStr();
    setDailyWrittenOverride(prev => {
      const base = prev ?? loadedDailyWritten;
      const next = base + delta;
      savePrefs({ dailyProgress: { date: today, written: next } });
      return next;
    });
  // loadedDailyWritten is stable within a session; intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalWordCount, savePrefs]);

  const setDailyGoal = useCallback((v: number) => {
    setDailyGoalOverride(v);
    savePrefs({ dailyGoal: v });
  }, [savePrefs]);

  const setProjectGoal = useCallback((v: number) => {
    setProjectGoalOverride(v);
    savePrefs({ projectGoal: v });
  }, [savePrefs]);

  const resetDailyProgress = useCallback(() => {
    setDailyWrittenOverride(0);
    savePrefs({ dailyProgress: { date: todayStr(), written: 0 } });
  }, [savePrefs]);

  return { dailyGoal, projectGoal, dailyWritten, setDailyGoal, setProjectGoal, resetDailyProgress };
}
