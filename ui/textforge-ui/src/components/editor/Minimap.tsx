import { useCallback, useEffect, useMemo, useRef } from 'react';

interface MinimapProps {
  content: string;
  scrollEl: HTMLElement | null;
}

export function Minimap({ content, scrollEl }: MinimapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollElRef = useRef<HTMLElement | null>(null);

  useEffect(() => { scrollElRef.current = scrollEl; }, [scrollEl]);

  const lines = useMemo(() => {
    const paras = content.split(/\n{2,}/).filter(p => p.trim());
    const out: Array<{ h1?: boolean; empty?: boolean; w?: number }> = [{ h1: true }];
    for (const p of paras) {
      const numLines = Math.max(1, Math.round(p.length / 65));
      for (let i = 0; i < numLines; i++) {
        const w = i === numLines - 1 ? 55 : 90;
        out.push({ w });
      }
      out.push({ empty: true });
    }
    return out;
  }, [content]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollElRef.current;
    if (!el || !viewportRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
  }, []);

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
