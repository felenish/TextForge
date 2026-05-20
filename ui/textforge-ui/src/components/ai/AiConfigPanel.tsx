import { useEffect, useState } from 'react';
import { getAiConfig, setAiConfig } from '../../api/ai';
import { useToast } from '../../contexts/ToastContext';

const MASKED = '••••••••';

interface AiConfigPanelProps {
  onSaved?: () => void;
}

export function AiConfigPanel({ onSaved }: AiConfigPanelProps) {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    getAiConfig()
      .then(cfg => {
        if (cfg) {
          setBaseUrl(cfg.baseUrl);
          setApiKey(cfg.apiKey); // will be '••••••••' if key was set
          setModel(cfg.model);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    if (!baseUrl.trim() || !model.trim()) {
      showToast('Base URL and Model are required.');
      return;
    }
    setSaving(true);
    try {
      await setAiConfig({ baseUrl: baseUrl.trim(), apiKey: apiKey === MASKED ? MASKED : apiKey.trim(), model: model.trim() });
      showToast('AI configuration saved.');
      onSaved?.();
    } catch {
      showToast('Failed to save AI configuration.');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <div className="ai-cfg-loading">Loading…</div>;

  return (
    <div className="ai-cfg-panel insp-body">
      <div className="insp-section">
        <h4>AI Provider</h4>
        <p className="ai-cfg-hint">
          Connect any OpenAI-compatible provider — OpenAI, Ollama, LM Studio, Groq, OpenRouter, Mistral, and more.
        </p>
      </div>

      <div className="insp-section">
        <label className="vs-form-label">Base URL</label>
        <input
          className="insp-input"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder="http://localhost:11434"
          spellCheck={false}
        />
        <p className="ai-cfg-hint" style={{ marginTop: 4 }}>
          Ollama: <code>http://localhost:11434</code><br />
          OpenAI: <code>https://api.openai.com</code>
        </p>
      </div>

      <div className="insp-section">
        <label className="vs-form-label">API Key</label>
        <input
          className="insp-input"
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="sk-… (leave blank if not required)"
        />
      </div>

      <div className="insp-section">
        <label className="vs-form-label">Model</label>
        <input
          className="insp-input"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="e.g. llama3, gpt-4o, mistral"
          spellCheck={false}
        />
      </div>

      <div className="insp-section">
        <button
          className="vs-btn primary"
          style={{ width: '100%' }}
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
