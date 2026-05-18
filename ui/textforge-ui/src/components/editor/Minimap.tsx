import { useMemo, useRef } from 'react';

interface MinimapProps {
  content: string;
  scrollEl: HTMLElement | null;
}

export function Minimap({ content, scrollEl }: MinimapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => {
    const paras = content.split(/\n{2,}/).filter(p => p.trim());
    const out: Array<{ h1?: boolean; empty?: boolean; w?: number }> = [{ h1: true }];
    for (const p of paras) {
      const numLines = Math.max(1, Math.round(p.length / 65));
      for (let i = 0; i < numLines; i++) {
        const w = i === numLines - 1 ? 40 + Math.random() * 40 : 88 + Math.random() * 10;
        out.push({ w });
      }
      out.push({ empty: true });
    }
    return out;
  }, [content]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollEl || !viewportRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    scrollEl.scrollTop = ratio * (scrollEl.scrollHeight - scrollEl.clientHeight);
  };

  return (
    <div className="minimap" onClick={handleClick}>
      <div className="minimap-inner">
        {lines.map((l, i) => (
          <div
            key={i}
            className={`minimap-line${l.h1 ? ' h1' : ''}${l.empty ? ' empty' : ''}`}
            style={{ width: l.empty || l.h1 ? undefined : `${l.w}%` }}
          />
        ))}
      </div>
      <div ref={viewportRef} className="minimap-viewport" style={{ top: 20, height: 80 }} />
    </div>
  );
}
