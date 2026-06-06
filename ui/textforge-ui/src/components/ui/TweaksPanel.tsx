import { useEffect, useRef } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { type EditorFont, type EditorSettings } from '../../hooks/useEditorSettings';

interface TweaksPanelProps {
  editorSettings: EditorSettings;
  onClose: () => void;
}

type Theme = 'dark' | 'light' | 'sepia';
const THEMES: Theme[] = ['dark', 'light', 'sepia'];
const FONTS: { value: EditorFont; label: string }[] = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans', label: 'Sans' },
  { value: 'mono', label: 'Mono' },
];

function Toggle({ on }: { on: boolean }) {
  return <div className={`tweaks-pill${on ? ' on' : ''}`} />;
}

export function TweaksPanel({ editorSettings, onClose }: TweaksPanelProps) {
  const {
    theme, applyTheme,
    inspectorOpen, setInspectorOpen,
    minimapOpen, setMinimapOpen,
  } = useWorkspace();
  const { font, fontSize, lineHeight, paragraphIndent, setFont, setFontSize, setLineHeight, setParagraphIndent } = editorSettings;

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={panelRef} className="tweaks-panel">
      <div className="tweaks-header">Tweaks</div>

      {/* Theme */}
      <div className="tweaks-section">
        <div className="tweaks-label">Theme</div>
        <div className="tweaks-radio-row">
          {THEMES.map(t => (
            <button
              key={t}
              className={`tweaks-radio${theme === t ? ' on' : ''}`}
              onClick={() => applyTheme(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Font */}
      <div className="tweaks-section">
        <div className="tweaks-label">Editor font</div>
        <div className="tweaks-radio-row">
          {FONTS.map(f => (
            <button
              key={f.value}
              className={`tweaks-radio${font === f.value ? ' on' : ''}`}
              onClick={() => setFont(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font size + Line height */}
      <div className="tweaks-section">
        <div className="tweaks-slider-row">
          <label>Font size</label>
          <input
            type="range" min={13} max={24} step={1} value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
          />
          <span className="val">{fontSize}px</span>
        </div>
        <div className="tweaks-slider-row">
          <label>Line height</label>
          <input
            type="range" min={1.3} max={2.2} step={0.05} value={lineHeight}
            onChange={e => setLineHeight(Number(e.target.value))}
          />
          <span className="val">{lineHeight.toFixed(2)}</span>
        </div>
        <div className="tweaks-slider-row">
          <label>Paragraph indent</label>
          <input
            type="range" min={0} max={4} step={0.5} value={paragraphIndent}
            onChange={e => setParagraphIndent(Number(e.target.value))}
          />
          <span className="val">{paragraphIndent === 0 ? 'None' : `${paragraphIndent}em`}</span>
        </div>
      </div>

      {/* Toggles */}
      <div className="tweaks-section">
        <div className="tweaks-toggle-row" onClick={() => setInspectorOpen(!inspectorOpen)}>
          <span>Inspector</span>
          <Toggle on={inspectorOpen} />
        </div>
        <div className="tweaks-toggle-row" onClick={() => setMinimapOpen(!minimapOpen)}>
          <span>Minimap</span>
          <Toggle on={minimapOpen} />
        </div>
      </div>
    </div>
  );
}
