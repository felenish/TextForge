import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { getAiConfig, streamComplete } from '../../api/ai';
import { getScene } from '../../api/scenes';
import { Icon } from '../ui/Icon';
import { AiConfigPanel } from './AiConfigPanel';

interface Template {
  id: string;
  label: string;
  systemPrompt: string;
  buildPrompt: (sceneText: string | null) => string;
}

const TEMPLATES: Template[] = [
  {
    id: 'copy-edit',
    label: 'Copy Edit',
    systemPrompt: 'You are a professional copy editor. Correct grammar, punctuation, word choice, and sentence flow while strictly preserving the author\'s voice and intent. Return only the corrected text with no commentary.',
    buildPrompt: t => t
      ? `Copy edit the following passage, fixing grammar, punctuation, and style:\n\n${t}`
      : 'No text provided.',
  },
  {
    id: 'revise',
    label: 'Revise',
    systemPrompt: 'You are a skilled fiction editor. Rewrite the passage for greater clarity, impact, and narrative strength while preserving the author\'s voice. Return only the revised text.',
    buildPrompt: t => t
      ? `Revise the following passage for clarity and narrative impact:\n\n${t}`
      : 'No text provided.',
  },
  {
    id: 'continue',
    label: 'Continue Writing',
    systemPrompt: 'You are a skilled fiction author. Continue the story naturally, matching the existing tone, voice, and pacing. Write 2–4 paragraphs.',
    buildPrompt: t => t
      ? `Continue writing this scene from where it ends:\n\n${t}`
      : 'Continue writing the current scene with 2–4 paragraphs.',
  },
  {
    id: 'improve',
    label: 'Improve Prose',
    systemPrompt: 'You are a prose editor. Revise the provided text to improve clarity, flow, and style while preserving the author\'s voice. Return only the revised text.',
    buildPrompt: t => t
      ? `Revise and improve the prose of this scene:\n\n${t}`
      : 'Provide general guidance on improving fiction prose.',
  },
  {
    id: 'analyze',
    label: 'Analyze Scene',
    systemPrompt: 'You are a developmental editor. Analyze the scene and provide constructive feedback.',
    buildPrompt: t => t
      ? `Analyze this scene for pacing, tension, character dynamics, and narrative effectiveness. Identify strengths and suggest improvements:\n\n${t}`
      : 'Explain how to analyze a fiction scene for pacing, tension, and character dynamics.',
  },
  {
    id: 'dialogue',
    label: 'Suggest Dialogue',
    systemPrompt: 'You are a dialogue coach for fiction. Write natural, character-distinct dialogue that advances the scene.',
    buildPrompt: t => t
      ? `Based on this scene, suggest dialogue that fits the characters and advances the narrative:\n\n${t}`
      : 'Suggest dialogue tips and examples for writing compelling fiction.',
  },
  {
    id: 'pacing',
    label: 'Check Pacing',
    systemPrompt: 'You are a fiction editor specializing in narrative pacing.',
    buildPrompt: t => t
      ? `Analyze the pacing of this scene. Identify where it moves too fast or too slow, and suggest specific improvements:\n\n${t}`
      : 'Explain how to diagnose and fix common pacing issues in fiction scenes.',
  },
  {
    id: 'summarize',
    label: 'Summarize Scene',
    systemPrompt: 'You are a story analyst. Write a concise, accurate summary.',
    buildPrompt: t => t
      ? `Write a 2–3 sentence summary of this scene, capturing the key events and emotional beats:\n\n${t}`
      : 'No scene is open. Please open a scene to summarize.',
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm Next',
    systemPrompt: 'You are a creative writing collaborator. Generate fresh, varied ideas for continuing the story.',
    buildPrompt: t => t
      ? `Based on this scene, brainstorm 5 different ideas for what could happen next in the story:\n\n${t}`
      : 'Brainstorm 5 compelling ways a scene could develop to create narrative momentum.',
  },
];

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type PanelMode = 'prompt' | 'config';

export interface AiAction {
  templateId: string;
  selectedText: string;
}

interface AiPanelProps {
  pendingAction?: AiAction | null;
  onActionConsumed?: () => void;
}

export function AiPanel({ pendingAction, onActionConsumed }: AiPanelProps) {
  const { activeSceneId } = useWorkspace();
  const [mode, setMode] = useState<PanelMode>('prompt');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [includeScene, setIncludeScene] = useState(true);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAiConfig()
      .then(cfg => setConfigured(cfg !== null && cfg.baseUrl !== ''))
      .catch(() => setConfigured(false));
  }, []);

  function handleConfigSaved() {
    setConfigured(true);
    setMode('prompt');
  }

  async function execute(tid: string, text: string | null) {
    if (runningRef.current) {
      abortRef.current?.abort();
      abortRef.current = null;
      runningRef.current = false;
      setRunning(false);
    }

    const template = TEMPLATES.find(t => t.id === tid) ?? TEMPLATES[0];
    let prompt = template.buildPrompt(text);
    if (extraInstructions.trim()) {
      prompt += `\n\nAdditional instructions: ${extraInstructions.trim()}`;
    }

    setOutput('');
    setRunning(true);
    runningRef.current = true;
    abortRef.current = new AbortController();

    try {
      await streamComplete(
        { prompt, systemPrompt: template.systemPrompt },
        token => {
          setOutput(prev => {
            const next = prev + token;
            setTimeout(() => {
              if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
            }, 0);
            return next;
          });
        },
        abortRef.current.signal,
      );
    } catch (err: unknown) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        const msg = (err as { message?: string })?.message ?? 'Request failed.';
        setOutput(prev => prev + (prev ? '\n\n' : '') + `[Error: ${msg}]`);
      }
    } finally {
      setRunning(false);
      runningRef.current = false;
      abortRef.current = null;
    }
  }

  async function handleRun() {
    if (running) { abortRef.current?.abort(); return; }
    let sceneText: string | null = null;
    if (includeScene && activeSceneId) {
      try {
        const scene = await getScene(activeSceneId);
        if (scene.content) sceneText = stripHtml(scene.content);
      } catch { /* ignore */ }
    }
    await execute(templateId, sceneText);
  }

  useEffect(() => {
    if (!pendingAction) return;
    const { templateId: tid, selectedText } = pendingAction;
    setTemplateId(tid);
    setOutput('');
    onActionConsumed?.();
    void execute(tid, selectedText || null);
  // execute is stable across renders (all deps are refs/setters); pendingAction is the real trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAction]);

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (configured === null) return null;

  if (mode === 'config' || !configured) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {configured && (
          <div className="ai-panel-toolbar">
            <button className="vs-icon-btn" onClick={() => setMode('prompt')} title="Back">
              <Icon name="chev-right" size={14} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <span style={{ fontSize: 'var(--fs-mono-xs)', color: 'var(--text-muted)' }}>AI Settings</span>
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <AiConfigPanel onSaved={handleConfigSaved} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="ai-panel-toolbar">
        <select
          className="ai-template-select"
          value={templateId}
          onChange={e => setTemplateId(e.target.value)}
          disabled={running}
        >
          {TEMPLATES.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <button className="vs-icon-btn" onClick={() => setMode('config')} title="AI Settings">
          <Icon name="settings" size={13} />
        </button>
      </div>

      <div className="ai-panel-options">
        <label className="ai-toggle" title={activeSceneId ? undefined : 'No scene open'}>
          <input
            type="checkbox"
            checked={includeScene && !!activeSceneId}
            onChange={e => setIncludeScene(e.target.checked)}
            disabled={!activeSceneId}
          />
          <span>Include scene context</span>
        </label>
      </div>

      <div className="ai-panel-instructions">
        <textarea
          className="insp-notes"
          placeholder="Additional instructions (optional)…"
          rows={2}
          value={extraInstructions}
          onChange={e => setExtraInstructions(e.target.value)}
          disabled={running}
        />
      </div>

      <div className="ai-panel-run">
        <button
          className={`vs-btn ${running ? 'secondary' : 'primary'}`}
          style={{ flex: 1 }}
          onClick={() => void handleRun()}
        >
          {running ? (
            <><Icon name="stop" size={11} /> Stop</>
          ) : (
            <><Icon name="sparkles" size={11} /> Run</>
          )}
        </button>
        {output && !running && (
          <button
            className="vs-btn secondary"
            onClick={() => void handleCopy()}
            title="Copy output"
          >
            <Icon name={copied ? 'copy-check' : 'copy'} size={13} />
          </button>
        )}
      </div>

      <div className="ai-panel-output" ref={outputRef}>
        {output ? (
          <div className="ai-output-text">
            <ReactMarkdown>{output}</ReactMarkdown>
          </div>
        ) : (
          <div className="ai-output-placeholder">
            {running ? 'Generating…' : 'Output will appear here.'}
          </div>
        )}
      </div>
    </div>
  );
}
