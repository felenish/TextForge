import { useCallback, useEffect, useRef, useState } from 'react';

const KEYS = {
  daily:    'tf-goal-daily',
  project:  'tf-goal-project',
  progress: 'tf-goal-progress', // { date: string; written: number }
} as const;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadProgress(): { date: string; written: number } {
  try {
    const s = localStorage.getItem(KEYS.progress);
    if (s) return JSON.parse(s) as { date: string; written: number };
  } catch { /* ignore */ }
  return { date: todayStr(), written: 0 };
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
  const [dailyGoal, setDailyGoalState] = useState(
    () => Number(localStorage.getItem(KEYS.daily) ?? '0'),
  );
  const [projectGoal, setProjectGoalState] = useState(
    () => Number(localStorage.getItem(KEYS.project) ?? '0'),
  );
  const [dailyWritten, setDailyWritten] = useState(() => {
    const { date, written } = loadProgress();
    return date === todayStr() ? written : 0;
  });

  const prevTotalRef = useRef<number>(totalWordCount);
  const initialised = useRef(false);

  useEffect(() => {
    // Skip the first render — we don't want to count the initial load as writing.
    if (!initialised.current) {
      initialised.current = true;
      prevTotalRef.current = totalWordCount;
      return;
    }
    const delta = totalWordCount - prevTotalRef.current;
    prevTotalRef.current = totalWordCount;
    if (delta <= 0) return;

    const today = todayStr();
    setDailyWritten(prev => {
      const stored = loadProgress();
      const base = stored.date === today ? stored.written : 0;
      const next = base + delta;
      localStorage.setItem(KEYS.progress, JSON.stringify({ date: today, written: next }));
      return next;
    });
  }, [totalWordCount]);

  const setDailyGoal = useCallback((v: number) => {
    localStorage.setItem(KEYS.daily, String(v));
    setDailyGoalState(v);
  }, []);

  const setProjectGoal = useCallback((v: number) => {
    localStorage.setItem(KEYS.project, String(v));
    setProjectGoalState(v);
  }, []);

  const resetDailyProgress = useCallback(() => {
    const today = todayStr();
    localStorage.setItem(KEYS.progress, JSON.stringify({ date: today, written: 0 }));
    setDailyWritten(0);
  }, []);

  return { dailyGoal, projectGoal, dailyWritten, setDailyGoal, setProjectGoal, resetDailyProgress };
}
