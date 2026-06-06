import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';

export type EditorFont = 'serif' | 'sans' | 'mono';

const FONT_FAMILIES: Record<EditorFont, string> = {
  serif: '"Spectral", Georgia, "Times New Roman", serif',
  sans: '"Geist", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
};

const VALID_FONTS = new Set<string>(['serif', 'sans', 'mono']);

export interface EditorSettings {
  font: EditorFont;
  fontSize: number;
  lineHeight: number;
  paragraphIndent: number;
  autosaveInterval: number;
  setFont: (v: EditorFont) => void;
  setFontSize: (v: number) => void;
  setLineHeight: (v: number) => void;
  setParagraphIndent: (v: number) => void;
  setAutosaveInterval: (v: number) => void;
}

export function useEditorSettings(): EditorSettings {
  const { loadedPrefs, savePrefs } = useWorkspace();

  // User-driven overrides sit on top of whatever was loaded from the backend.
  // null means "not yet overridden by the user — use the loaded value".
  const [fontOverride, setFontOverride] = useState<EditorFont | null>(null);
  const [fontSizeOverride, setFontSizeOverride] = useState<number | null>(null);
  const [lineHeightOverride, setLineHeightOverride] = useState<number | null>(null);
  const [paragraphIndentOverride, setParagraphIndentOverride] = useState<number | null>(null);
  const [autosaveIntervalOverride, setAutosaveIntervalOverride] = useState<number | null>(null);

  const font = useMemo<EditorFont>(() => {
    if (fontOverride !== null) return fontOverride;
    const f = loadedPrefs?.editorFont;
    return f && VALID_FONTS.has(f) ? f as EditorFont : 'serif';
  }, [fontOverride, loadedPrefs]);

  const fontSize = fontSizeOverride ?? loadedPrefs?.fontSize ?? 17;
  const lineHeight = lineHeightOverride ?? loadedPrefs?.lineHeight ?? 1.7;
  const paragraphIndent = paragraphIndentOverride ?? loadedPrefs?.paragraphIndent ?? 0;
  const autosaveInterval = autosaveIntervalOverride ?? loadedPrefs?.autosaveInterval ?? 15;

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-font-family', FONT_FAMILIES[font]);
  }, [font]);

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-fs', `${fontSize}px`);
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-lh', String(lineHeight));
  }, [lineHeight]);

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-para-indent', `${paragraphIndent}em`);
  }, [paragraphIndent]);

  const setFont = useCallback((v: EditorFont) => {
    setFontOverride(v);
    savePrefs({ editorFont: v });
  }, [savePrefs]);

  const setFontSize = useCallback((v: number) => {
    setFontSizeOverride(v);
    savePrefs({ fontSize: v });
  }, [savePrefs]);

  const setLineHeight = useCallback((v: number) => {
    setLineHeightOverride(v);
    savePrefs({ lineHeight: v });
  }, [savePrefs]);

  const setParagraphIndent = useCallback((v: number) => {
    setParagraphIndentOverride(v);
    savePrefs({ paragraphIndent: v });
  }, [savePrefs]);

  const setAutosaveInterval = useCallback((v: number) => {
    setAutosaveIntervalOverride(v);
    savePrefs({ autosaveInterval: v });
  }, [savePrefs]);

  return { font, fontSize, lineHeight, paragraphIndent, autosaveInterval, setFont, setFontSize, setLineHeight, setParagraphIndent, setAutosaveInterval };
}
