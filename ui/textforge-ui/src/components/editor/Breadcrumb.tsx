import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Icon } from '../ui/Icon';

interface BreadcrumbProps {
  sceneTitle: string;
}

function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 200));
}

export function Breadcrumb({ sceneTitle }: BreadcrumbProps) {
  const { seriesTitle, wordCount } = useWorkspace();

  return (
    <div className="breadcrumb">
      <span className="crumb"><Icon name="book" size={11} /></span>
      {seriesTitle && <span className="crumb">{seriesTitle}</span>}
      {seriesTitle && <span className="sep"><Icon name="chev-right" size={10} /></span>}
      <span className="crumb current">{sceneTitle}</span>
      <span style={{ flex: 1 }} />
      <span style={{ color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
        {wordCount.toLocaleString()} words · {readingMinutes(wordCount)} min read
      </span>
    </div>
  );
}
