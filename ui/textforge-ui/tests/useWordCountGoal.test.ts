import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWordCountGoal } from '../src/hooks/useWordCountGoal';

const TODAY = '2026-05-30';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T10:00:00Z`));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useWordCountGoal', () => {
  describe('initial state', () => {
    it('defaults dailyGoal to 0 when nothing stored', () => {
      const { result } = renderHook(() => useWordCountGoal(0));
      expect(result.current.dailyGoal).toBe(0);
    });

    it('defaults projectGoal to 0 when nothing stored', () => {
      const { result } = renderHook(() => useWordCountGoal(0));
      expect(result.current.projectGoal).toBe(0);
    });

    it('defaults dailyWritten to 0 when nothing stored', () => {
      const { result } = renderHook(() => useWordCountGoal(0));
      expect(result.current.dailyWritten).toBe(0);
    });

    it('reads stored dailyGoal on init', () => {
      localStorage.setItem('tf-goal-daily', '500');
      const { result } = renderHook(() => useWordCountGoal(0));
      expect(result.current.dailyGoal).toBe(500);
    });

    it('reads stored projectGoal on init', () => {
      localStorage.setItem('tf-goal-project', '80000');
      const { result } = renderHook(() => useWordCountGoal(0));
      expect(result.current.projectGoal).toBe(80000);
    });

    it('restores dailyWritten from storage when date is today', () => {
      localStorage.setItem('tf-goal-progress', JSON.stringify({ date: TODAY, written: 250 }));
      const { result } = renderHook(() => useWordCountGoal(0));
      expect(result.current.dailyWritten).toBe(250);
    });

    it('resets dailyWritten to 0 when stored date is yesterday', () => {
      localStorage.setItem('tf-goal-progress', JSON.stringify({ date: '2026-05-29', written: 500 }));
      const { result } = renderHook(() => useWordCountGoal(0));
      expect(result.current.dailyWritten).toBe(0);
    });
  });

  describe('goal setters', () => {
    it('setDailyGoal updates state and persists to localStorage', () => {
      const { result } = renderHook(() => useWordCountGoal(0));
      act(() => result.current.setDailyGoal(1000));
      expect(result.current.dailyGoal).toBe(1000);
      expect(localStorage.getItem('tf-goal-daily')).toBe('1000');
    });

    it('setProjectGoal updates state and persists to localStorage', () => {
      const { result } = renderHook(() => useWordCountGoal(0));
      act(() => result.current.setProjectGoal(50000));
      expect(result.current.projectGoal).toBe(50000);
      expect(localStorage.getItem('tf-goal-project')).toBe('50000');
    });
  });

  describe('word count tracking', () => {
    it('does not add delta on first render', () => {
      const { result } = renderHook(() => useWordCountGoal(100));
      expect(result.current.dailyWritten).toBe(0);
    });

    it('accumulates positive delta when totalWordCount increases', () => {
      const { result, rerender } = renderHook(
        ({ count }) => useWordCountGoal(count),
        { initialProps: { count: 100 } },
      );

      act(() => rerender({ count: 150 }));

      expect(result.current.dailyWritten).toBe(50);
    });

    it('ignores negative delta (deleting words)', () => {
      const { result, rerender } = renderHook(
        ({ count }) => useWordCountGoal(count),
        { initialProps: { count: 200 } },
      );

      act(() => rerender({ count: 150 }));

      expect(result.current.dailyWritten).toBe(0);
    });

    it('ignores zero delta', () => {
      const { result, rerender } = renderHook(
        ({ count }) => useWordCountGoal(count),
        { initialProps: { count: 100 } },
      );

      act(() => rerender({ count: 100 }));

      expect(result.current.dailyWritten).toBe(0);
    });

    it('accumulates multiple positive deltas', () => {
      const { result, rerender } = renderHook(
        ({ count }) => useWordCountGoal(count),
        { initialProps: { count: 0 } },
      );

      act(() => rerender({ count: 100 }));
      act(() => rerender({ count: 250 }));
      act(() => rerender({ count: 400 }));

      expect(result.current.dailyWritten).toBe(400);
    });

    it('persists accumulated progress to localStorage', () => {
      const { rerender } = renderHook(
        ({ count }) => useWordCountGoal(count),
        { initialProps: { count: 0 } },
      );

      act(() => rerender({ count: 75 }));

      const stored = JSON.parse(localStorage.getItem('tf-goal-progress')!);
      expect(stored.written).toBe(75);
      expect(stored.date).toBe(TODAY);
    });

    it('mixed positive and negative deltas only counts positive', () => {
      const { result, rerender } = renderHook(
        ({ count }) => useWordCountGoal(count),
        { initialProps: { count: 100 } },
      );

      act(() => rerender({ count: 200 })); // +100
      act(() => rerender({ count: 150 })); // -50 — ignored
      act(() => rerender({ count: 180 })); // +30

      expect(result.current.dailyWritten).toBe(130);
    });
  });

  describe('resetDailyProgress', () => {
    it('sets dailyWritten to 0', () => {
      const { result, rerender } = renderHook(
        ({ count }) => useWordCountGoal(count),
        { initialProps: { count: 0 } },
      );

      act(() => rerender({ count: 200 }));
      expect(result.current.dailyWritten).toBe(200);

      act(() => result.current.resetDailyProgress());
      expect(result.current.dailyWritten).toBe(0);
    });

    it('writes zeroed progress to localStorage', () => {
      const { result } = renderHook(() => useWordCountGoal(0));

      act(() => result.current.resetDailyProgress());

      const stored = JSON.parse(localStorage.getItem('tf-goal-progress')!);
      expect(stored.written).toBe(0);
      expect(stored.date).toBe(TODAY);
    });
  });

  describe('malformed localStorage', () => {
    it('handles corrupt progress JSON gracefully, defaulting to 0', () => {
      localStorage.setItem('tf-goal-progress', '{not valid json}');
      const { result } = renderHook(() => useWordCountGoal(0));
      expect(result.current.dailyWritten).toBe(0);
    });
  });
});
