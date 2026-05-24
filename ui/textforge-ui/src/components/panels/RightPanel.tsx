import { useEffect, useState } from 'react';
import { Inspector } from '../inspector/Inspector';
import { AiPanel } from '../ai/AiPanel';
import { Icon } from '../ui/Icon';

type RightTab = 'inspector' | 'ai';

interface RightPanelProps {
  onViewHistory?: () => void;
}

export interface AiAction {
  templateId: string;
  selectedText: string;
}

export function RightPanel({ onViewHistory }: RightPanelProps) {
  const [tab, setTab] = useState<RightTab>('inspector');
  const [pendingAction, setPendingAction] = useState<AiAction | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AiAction>).detail;
      setTab('ai');
      setPendingAction(detail);
    };
    window.addEventListener('tf-ai-action', handler);
    return () => window.removeEventListener('tf-ai-action', handler);
  }, []);

  return (
    <aside className="inspector">
      <div className="right-panel-tabs">
        <button
          className={`rp-tab${tab === 'inspector' ? ' active' : ''}`}
          onClick={() => setTab('inspector')}
          title="Inspector"
        >
          <Icon name="info" size={13} />
          <span>Inspector</span>
        </button>
        <button
          className={`rp-tab${tab === 'ai' ? ' active' : ''}`}
          onClick={() => setTab('ai')}
          title="AI Assistant"
        >
          <Icon name="sparkles" size={13} />
          <span>AI</span>
        </button>
      </div>

      {tab === 'inspector' && <Inspector onViewHistory={onViewHistory} />}
      {tab === 'ai' && (
        <AiPanel
          pendingAction={pendingAction}
          onActionConsumed={() => setPendingAction(null)}
        />
      )}
    </aside>
  );
}
