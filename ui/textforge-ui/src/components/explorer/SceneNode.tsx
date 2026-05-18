import { useState } from 'react';
import type { SceneMetaDto } from '../../api/books';
import { ContextMenu, type ContextMenuItem } from '../ui/ContextMenu';

interface SceneNodeProps {
  scene: SceneMetaDto;
  onOpen: (sceneId: string, sceneTitle: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function SceneNode({ scene, onOpen, onRename, onDelete }: SceneNodeProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);

  const menuItems: ContextMenuItem[] = [
    { label: 'Open', onClick: () => onOpen(scene.id, scene.title) },
    {
      label: 'Rename',
      onClick: () => {
        const title = window.prompt('New scene title:', scene.title);
        if (title?.trim() && title !== scene.title) onRename(scene.id, title.trim());
      },
    },
    {
      label: 'Delete',
      onClick: () => {
        if (window.confirm(`Delete scene "${scene.title}"?`)) onDelete(scene.id);
      },
    },
  ];

  return (
    <div
      style={{
        padding: '3px 8px 3px 28px',
        cursor: 'pointer',
        color: '#c8c8c8',
        fontSize: '13px',
        userSelect: 'none',
        background: hovered ? '#2a2d2e' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
      onDoubleClick={() => onOpen(scene.id, scene.title)}
      onContextMenu={e => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ color: '#569cd6', fontSize: '11px' }}>§</span>
      {scene.title}

      {menu && (
        <ContextMenu items={menuItems} position={menu} onClose={() => setMenu(null)} />
      )}
    </div>
  );
}
