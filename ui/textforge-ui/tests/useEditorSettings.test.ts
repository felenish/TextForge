import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorSettings } from '../src/hooks/useEditorSettings';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.removeProperty('--editor-font-family');
  document.documentElement.style.removeProperty('--editor-fs');
  document.documentElement.style.removeProperty('--editor-lh');
});

describe('useEditorSettings', () => {
  describe('defaults', () => {
    it('defaults to serif font when nothing is stored', () => {
      const { result } = renderHook(() => useEditorSettings());
      expect(result.current.font).toBe('serif');
    });

    it('defaults fontSize to 17', () => {
      const { result } = renderHook(() => useEditorSettings());
      expect(result.current.fontSize).toBe(17);
    });

    it('defaults lineHeight to 1.7', () => {
      const { result } = renderHook(() => useEditorSettings());
      expect(result.current.lineHeight).toBe(1.7);
    });

    it('defaults autosaveInterval to 15', () => {
      const { result } = renderHook(() => useEditorSettings());
      expect(result.current.autosaveInterval).toBe(15);
    });
  });

  describe('localStorage persistence', () => {
    it('reads stored font on init', () => {
      localStorage.setItem('tf-editor-font', 'mono');
      const { result } = renderHook(() => useEditorSettings());
      expect(result.current.font).toBe('mono');
    });

    it('reads stored fontSize on init', () => {
      localStorage.setItem('tf-editor-fs', '20');
      const { result } = renderHook(() => useEditorSettings());
      expect(result.current.fontSize).toBe(20);
    });

    it('reads stored lineHeight on init', () => {
      localStorage.setItem('tf-editor-lh', '2.0');
      const { result } = renderHook(() => useEditorSettings());
      expect(result.current.lineHeight).toBe(2.0);
    });

    it('reads stored autosaveInterval on init', () => {
      localStorage.setItem('tf-editor-autosave', '30');
      const { result } = renderHook(() => useEditorSettings());
      expect(result.current.autosaveInterval).toBe(30);
    });

    it('persists font to localStorage on change', () => {
      const { result } = renderHook(() => useEditorSettings());
      act(() => result.current.setFont('sans'));
      expect(localStorage.getItem('tf-editor-font')).toBe('sans');
    });

    it('persists fontSize to localStorage on change', () => {
      const { result } = renderHook(() => useEditorSettings());
      act(() => result.current.setFontSize(22));
      expect(localStorage.getItem('tf-editor-fs')).toBe('22');
    });

    it('persists lineHeight to localStorage on change', () => {
      const { result } = renderHook(() => useEditorSettings());
      act(() => result.current.setLineHeight(1.5));
      expect(localStorage.getItem('tf-editor-lh')).toBe('1.5');
    });

    it('persists autosaveInterval to localStorage on change', () => {
      const { result } = renderHook(() => useEditorSettings());
      act(() => result.current.setAutosaveInterval(60));
      expect(localStorage.getItem('tf-editor-autosave')).toBe('60');
    });
  });

  describe('CSS variable injection', () => {
    it('sets --editor-font-family on mount with default serif', () => {
      renderHook(() => useEditorSettings());
      const val = document.documentElement.style.getPropertyValue('--editor-font-family');
      expect(val).toContain('serif');
    });

    it('sets --editor-fs on mount with default 17px', () => {
      renderHook(() => useEditorSettings());
      expect(document.documentElement.style.getPropertyValue('--editor-fs')).toBe('17px');
    });

    it('sets --editor-lh on mount with default 1.7', () => {
      renderHook(() => useEditorSettings());
      expect(document.documentElement.style.getPropertyValue('--editor-lh')).toBe('1.7');
    });

    it('updates --editor-font-family when font changes', () => {
      const { result } = renderHook(() => useEditorSettings());
      act(() => result.current.setFont('mono'));
      expect(document.documentElement.style.getPropertyValue('--editor-font-family')).toContain('monospace');
    });

    it('updates --editor-fs when fontSize changes', () => {
      const { result } = renderHook(() => useEditorSettings());
      act(() => result.current.setFontSize(24));
      expect(document.documentElement.style.getPropertyValue('--editor-fs')).toBe('24px');
    });

    it('updates --editor-lh when lineHeight changes', () => {
      const { result } = renderHook(() => useEditorSettings());
      act(() => result.current.setLineHeight(2.0));
      expect(document.documentElement.style.getPropertyValue('--editor-lh')).toBe('2');
    });
  });

  describe('state updates', () => {
    it('updates font state on setFont', () => {
      const { result } = renderHook(() => useEditorSettings());
      act(() => result.current.setFont('sans'));
      expect(result.current.font).toBe('sans');
    });

    it('updates fontSize state on setFontSize', () => {
      const { result } = renderHook(() => useEditorSettings());
      act(() => result.current.setFontSize(19));
      expect(result.current.fontSize).toBe(19);
    });

    it('updates lineHeight state on setLineHeight', () => {
      const { result } = renderHook(() => useEditorSettings());
      act(() => result.current.setLineHeight(1.9));
      expect(result.current.lineHeight).toBe(1.9);
    });

    it('updates autosaveInterval state on setAutosaveInterval', () => {
      const { result } = renderHook(() => useEditorSettings());
      act(() => result.current.setAutosaveInterval(45));
      expect(result.current.autosaveInterval).toBe(45);
    });
  });
});
