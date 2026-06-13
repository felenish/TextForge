import { useEffect, useState, useCallback } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { type EditorSettings, type EditorFont } from '../../hooks/useEditorSettings';
import { type WordCountGoal } from '../../hooks/useWordCountGoal';
import { useModules } from '../../hooks/useModules';
import { enableModule, disableModule, type ModuleDto } from '../../api/modules';
import { AiConfigPanel } from '../ai/AiConfigPanel';
import { Icon } from '../ui/Icon';

type Section = 'appearance' | 'editor' | 'goals' | 'ai' | 'modules';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'appearance', label: 'Appearance',  icon: 'sun'      },
  { id: 'editor',     label: 'Editor',      icon: 'type'     },
  { id: 'goals',      label: 'Goals',       icon: 'target'   },
  { id: 'ai',         label: 'AI Provider', icon: 'sparkles' },
  { id: 'modules',    label: 'Modules',     icon: 'puzzle'   },
];

type Theme = 'dark' | 'light' | 'sepia';
const THEMES: { value: Theme; label: string }[] = [
  { value: 'dark',  label: 'Dark'  },
  { value: 'light', label: 'Light' },
  { value: 'sepia', label: 'Sepia' },
];

const FONTS: { value: EditorFont; label: string }[] = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans',  label: 'Sans'  },
  { value: 'mono',  label: 'Mono'  },
];

interface Props {
  editorSettings: EditorSettings;
  goalSettings: WordCountGoal;
  initialSection?: Section;
  onClose: () => void;
}

// Update AppLayout type
export type { Section as SettingsSection };

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      className={`sett-toggle${on ? ' on' : ''}`}
      onClick={() => onChange(!on)}
    />
  );
}

export function SettingsModal({ editorSettings, goalSettings, initialSection = 'appearance', onClose }: Props) {
  const [section, setSection] = useState<Section>(initialSection);
  const {
    theme, applyTheme,
    typewriterMode, setTypewriterMode,
    inspectorOpen, setInspectorOpen,
    minimapOpen, setMinimapOpen,
    bottomOpen, setBottomOpen,
  } = useWorkspace();
  const { font, fontSize, lineHeight, paragraphIndent, autosaveInterval, setFont, setFontSize, setLineHeight, setParagraphIndent, setAutosaveInterval } = editorSettings;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="vs-modal-overlay" onMouseDown={onClose}>
      <div className="sett-dialog" onMouseDown={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sett-header">
          <span className="sett-title">Settings</span>
          <button className="vs-icon-btn" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="sett-body">
          {/* Left nav */}
          <nav className="sett-nav">
            {NAV.map(n => (
              <button
                key={n.id}
                className={`sett-nav-item${section === n.id ? ' active' : ''}`}
                onClick={() => setSection(n.id)}
              >
                <Icon name={n.icon} size={14} />
                {n.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="sett-content">

            {section === 'appearance' && (
              <>
                <div className="sett-section-title">Appearance</div>

                <div className="sett-field">
                  <div className="sett-field-label">Theme</div>
                  <div className="sett-radio-row">
                    {THEMES.map(t => (
                      <button
                        key={t.value}
                        className={`sett-radio-btn${theme === t.value ? ' active' : ''}`}
                        onClick={() => applyTheme(t.value)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sett-field">
                  <div className="sett-field-label">Panels</div>
                  <div className="sett-toggle-row">
                    <span>Inspector</span>
                    <Toggle on={inspectorOpen} onChange={setInspectorOpen} />
                  </div>
                  <div className="sett-toggle-row">
                    <span>Minimap</span>
                    <Toggle on={minimapOpen} onChange={setMinimapOpen} />
                  </div>
                  <div className="sett-toggle-row">
                    <span>Bottom Panel</span>
                    <Toggle on={bottomOpen} onChange={setBottomOpen} />
                  </div>
                </div>
              </>
            )}

            {section === 'editor' && (
              <>
                <div className="sett-section-title">Editor</div>

                <div className="sett-field">
                  <div className="sett-field-label">Font family</div>
                  <div className="sett-radio-row">
                    {FONTS.map(f => (
                      <button
                        key={f.value}
                        className={`sett-radio-btn${font === f.value ? ' active' : ''}`}
                        onClick={() => setFont(f.value)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sett-field">
                  <div className="sett-field-label">Font size</div>
                  <div className="sett-slider-row">
                    <input
                      type="range" min={13} max={24} step={1} value={fontSize}
                      onChange={e => setFontSize(Number(e.target.value))}
                    />
                    <span className="sett-slider-val">{fontSize}px</span>
                  </div>
                </div>

                <div className="sett-field">
                  <div className="sett-field-label">Line height</div>
                  <div className="sett-slider-row">
                    <input
                      type="range" min={1.3} max={2.2} step={0.05} value={lineHeight}
                      onChange={e => setLineHeight(Number(e.target.value))}
                    />
                    <span className="sett-slider-val">{lineHeight.toFixed(2)}</span>
                  </div>
                </div>

                <div className="sett-field">
                  <div className="sett-field-label">Paragraph indent</div>
                  <div className="sett-slider-row">
                    <input
                      type="range" min={0} max={4} step={0.5} value={paragraphIndent}
                      onChange={e => setParagraphIndent(Number(e.target.value))}
                    />
                    <span className="sett-slider-val">
                      {paragraphIndent === 0 ? 'None' : `${paragraphIndent}em`}
                    </span>
                  </div>
                </div>

                <div className="sett-field">
                  <div className="sett-field-label">Autosave</div>
                  <div className="sett-radio-row">
                    {([0, 15, 30, 60, 120, 300] as const).map(s => (
                      <button
                        key={s}
                        className={`sett-radio-btn${autosaveInterval === s ? ' active' : ''}`}
                        onClick={() => setAutosaveInterval(s)}
                      >
                        {s === 0 ? 'Off' : s < 60 ? `${s}s` : `${s / 60}m`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sett-field">
                  <div className="sett-field-label">Modes</div>
                  <div className="sett-toggle-row">
                    <span>Typewriter mode</span>
                    <Toggle on={typewriterMode} onChange={setTypewriterMode} />
                  </div>
                </div>
              </>
            )}

            {section === 'goals' && (
              <GoalsSection goalSettings={goalSettings} />
            )}

            {section === 'ai' && (
              <>
                <div className="sett-section-title">AI Provider</div>
                <AiConfigPanel />
              </>
            )}

            {section === 'modules' && <ModulesSection />}

          </div>
        </div>

      </div>
    </div>
  );
}

function ModulesSection() {
  const { activeBookId } = useWorkspace();
  const { modules, loading } = useModules(activeBookId);
  const [toggling, setToggling] = useState<string | null>(null);
  const [localModules, setLocalModules] = useState<ModuleDto[]>([]);

  useEffect(() => { setLocalModules(modules); }, [modules]);

  const handleToggle = useCallback(async (mod: ModuleDto) => {
    if (!activeBookId || mod.builtIn || toggling) return;
    setToggling(mod.id);
    try {
      if (mod.enabled) {
        await disableModule(mod.id, activeBookId);
        setLocalModules(prev => prev.map(m => m.id === mod.id ? { ...m, enabled: false } : m));
      } else {
        await enableModule(mod.id, activeBookId);
        setLocalModules(prev => prev.map(m => m.id === mod.id ? { ...m, enabled: true } : m));
      }
    } catch {
      // revert on error — re-render will reconcile with server state next fetch
    } finally {
      setToggling(null);
    }
  }, [activeBookId, toggling]);

  return (
    <>
      <div className="sett-section-title">Modules</div>

      {!activeBookId && (
        <p className="ai-cfg-hint">Open a book to manage its modules.</p>
      )}

      {activeBookId && loading && (
        <p className="ai-cfg-hint">Loading modules…</p>
      )}

      {activeBookId && !loading && localModules.length === 0 && (
        <p className="ai-cfg-hint">No modules installed. Drop module folders into the <code>modules/</code> directory and restart.</p>
      )}

      {activeBookId && !loading && localModules.map(mod => (
        <div key={mod.id} className="sett-field" style={{ paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="puzzle" size={14} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, color: 'var(--text-strong)', fontSize: 13 }}>{mod.name}</div>
              {mod.description && (
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{mod.description}</div>
              )}
              <div style={{ color: 'var(--text-faint)', fontSize: 11, marginTop: 2 }}>
                v{mod.version}{mod.author ? ` · ${mod.author}` : ''}{mod.builtIn ? ' · built-in' : ''}
              </div>
            </div>
            {mod.builtIn ? (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Always on</span>
            ) : (
              <button
                role="switch"
                aria-checked={mod.enabled}
                className={`sett-toggle${mod.enabled ? ' on' : ''}${toggling === mod.id ? ' sett-toggle-busy' : ''}`}
                onClick={() => handleToggle(mod)}
                disabled={toggling !== null}
              />
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function GoalsSection({ goalSettings }: { goalSettings: WordCountGoal }) {
  const { dailyGoal, projectGoal, dailyWritten, setDailyGoal, setProjectGoal, resetDailyProgress } = goalSettings;
  const [dailyInput, setDailyInput] = useState(String(dailyGoal || ''));
  const [projectInput, setProjectInput] = useState(String(projectGoal || ''));

  function commitDaily() {
    const v = Math.max(0, Math.floor(Number(dailyInput) || 0));
    setDailyGoal(v);
    setDailyInput(v > 0 ? String(v) : '');
  }

  function commitProject() {
    const v = Math.max(0, Math.floor(Number(projectInput) || 0));
    setProjectGoal(v);
    setProjectInput(v > 0 ? String(v) : '');
  }

  const dailyPct = dailyGoal > 0 ? Math.min(1, dailyWritten / dailyGoal) : 0;
  const dailyDone = dailyGoal > 0 && dailyWritten >= dailyGoal;

  return (
    <>
      <div className="sett-section-title">Goals</div>

      <div className="sett-field">
        <div className="sett-field-label">Daily writing goal (words)</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="insp-input"
            style={{ margin: 0, width: 100 }}
            type="number"
            min={0}
            placeholder="e.g. 1000"
            value={dailyInput}
            onChange={e => setDailyInput(e.target.value)}
            onBlur={commitDaily}
            onKeyDown={e => { if (e.key === 'Enter') commitDaily(); }}
          />
          {dailyGoal > 0 && (
            <span style={{ fontSize: 'var(--fs-mono-xs)', color: dailyDone ? 'var(--status-final)' : 'var(--text-muted)' }}>
              {dailyWritten.toLocaleString()} / {dailyGoal.toLocaleString()} today
              {dailyDone ? ' ✓' : ''}
            </span>
          )}
        </div>
        {dailyGoal > 0 && (
          <div className="goal-progress-bar" style={{ marginTop: 8 }}>
            <div className="goal-progress-fill" style={{ width: `${dailyPct * 100}%`, background: dailyDone ? 'var(--status-final)' : 'var(--accent)' }} />
          </div>
        )}
        {dailyGoal > 0 && (
          <button
            className="vs-btn secondary"
            style={{ marginTop: 8, fontSize: 'var(--fs-mono-xs)' }}
            onClick={resetDailyProgress}
          >
            Reset today&apos;s progress
          </button>
        )}
        <p className="ai-cfg-hint" style={{ marginTop: 6 }}>Set to 0 to disable. Progress resets at midnight.</p>
      </div>

      <div className="sett-field">
        <div className="sett-field-label">Project word count target</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="insp-input"
            style={{ margin: 0, width: 100 }}
            type="number"
            min={0}
            placeholder="e.g. 80000"
            value={projectInput}
            onChange={e => setProjectInput(e.target.value)}
            onBlur={commitProject}
            onKeyDown={e => { if (e.key === 'Enter') commitProject(); }}
          />
        </div>
        <p className="ai-cfg-hint" style={{ marginTop: 6 }}>Set to 0 to disable. Measured against the total series word count.</p>
      </div>
    </>
  );
}
