import { useState } from 'react';
import type { ChapterDto } from '../../api/books';
import { ContextMenu, type ContextMenuItem } from '../ui/ContextMenu';
import { SceneNode } from './SceneNode';

interface ChapterNodeProps {
  chapter: ChapterDto;
  onAddScene: (chapterId: string, title: string) => Promise<void>;
  onRenameChapter: (id: string, title: string) => Promise<void>;
  onDeleteChapter: (id: string) => Promise<void>;
  onSceneOpen: (sceneId: string, sceneTitle: string) => void;
  onRenameScene: (id: string, title: string) => Promise<void>;
  onDeleteScene: (id: string) => Promise<void>;
}

export function ChapterNode({
  chapter,
  onAddScene,
  onRenameChapter,
  onDeleteChapter,
  onSceneOpen,
  onRenameScene,
  onDeleteScene,
}: ChapterNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  const menuItems: ContextMenuItem[] = [
    {
      label: 'Add Scene',
      onClick: () => {
        const title = window.prompt('Scene title:');
        if (title?.trim()) onAddScene(chapter.id, title.trim());
      },
    },
    {
      label: 'Rename',
      onClick: () => {
        const title = window.prompt('New chapter title:', chapter.title);
        if (title?.trim() && title !== chapter.title) onRenameChapter(chapter.id, title.trim());
      },
    },
    {
      label: 'Delete',
      onClick: () => {
        if (window.confirm(`Delete chapter "${chapter.title}" and all its scenes?`)) {
          onDeleteChapter(chapter.id);
        }
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          cursor: 'pointer',
          color: '#d4d4d4',
          fontSize: '13px',
          fontWeight: 500,
          userSelect: 'none',
          background: hovered ? '#2a2d2e' : 'transparent',
          gap: '4px',
        }}
        onClick={() => setExpanded(x => !x)}
        onContextMenu={e => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span style={{ fontSize: '9px', color: '#888', width: '10px' }}>
          {expanded ? '▼' : '▶'}
        </span>
        {chapter.title}
        <span style={{ marginLeft: 'auto', color: '#666', fontSize: '11px' }}>
          {chapter.scenes.length}
        </span>
      </div>

      {expanded && chapter.scenes.map(scene => (
        <SceneNode
          key={scene.id}
          scene={scene}
          onOpen={onSceneOpen}
          onRename={onRenameScene}
          onDelete={onDeleteScene}
        />
      ))}

      {menu && (
        <ContextMenu items={menuItems} position={menu} onClose={() => setMenu(null)} />
      )}
    </div>
  );
}
