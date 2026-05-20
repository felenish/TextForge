import { useCallback, useEffect, useState } from 'react';

export type EditorFont = 'serif' | 'sans' | 'mono';

const FONT_FAMILIES: Record<EditorFont, string> = {
  serif: '"Spectral", Georgia, "Times New Roman", serif',
  sans: '"Geist", ui-sans-serif, system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
};

export interface EditorSettings {
  font: EditorFont;
  fontSize: number;
  lineHeight: number;
  autosaveInterval: number;
  setFont: (v: EditorFont) => void;
  setFontSize: (v: number) => void;
  setLineHeight: (v: number) => void;
  setAutosaveInterval: (v: number) => void;
}

export function useEditorSettings(): EditorSettings {
  const [font, setFontState] = useState<EditorFont>(
    () => (localStorage.getItem('tf-editor-font') as EditorFont | null) ?? 'serif',
  );
  const [fontSize, setFontSizeState] = useState(
    () => Number(localStorage.getItem('tf-editor-fs') ?? '17'),
  );
  const [lineHeight, setLineHeightState] = useState(
    () => Number(localStorage.getItem('tf-editor-lh') ?? '1.7'),
  );
  const [autosaveInterval, setAutosaveIntervalState] = useState(
    () => Number(localStorage.getItem('tf-editor-autosave') ?? '60'),
  );

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-font-family', FONT_FAMILIES[font]);
    localStorage.setItem('tf-editor-font', font);
  }, [font]);

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-fs', `${fontSize}px`);
    localStorage.setItem('tf-editor-fs', String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-lh', String(lineHeight));
    localStorage.setItem('tf-editor-lh', String(lineHeight));
  }, [lineHeight]);

  useEffect(() => {
    localStorage.setItem('tf-editor-autosave', String(autosaveInterval));
  }, [autosaveInterval]);

  const setFont = useCallback((v: EditorFont) => setFontState(v), []);
  const setFontSize = useCallback((v: number) => setFontSizeState(v), []);
  const setLineHeight = useCallback((v: number) => setLineHeightState(v), []);
  const setAutosaveInterval = useCallback((v: number) => setAutosaveIntervalState(v), []);

  return { font, fontSize, lineHeight, autosaveInterval, setFont, setFontSize, setLineHeight, setAutosaveInterval };
}
