import { useState } from 'react';
import type { SceneMetaDto } from '../../api/books';
import { ContextMenu, type ContextMenuEntry } from '../ui/ContextMenu';
import { Icon } from '../ui/Icon';

interface SceneNodeProps {
  scene: SceneMetaDto;
  onOpen: (sceneId: string, sceneTitle: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function SceneNode({ scene, onOpen, onRename, onDelete }: SceneNodeProps) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const menuItems: ContextMenuEntry[] = [
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
      className="tree-row is-scene"
      style={{ paddingLeft: '28px' }}
      onDoubleClick={() => onOpen(scene.id, scene.title)}
      onContextMenu={e => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
    >
      <span className="chev leaf">
        <Icon name="chev-right" size={12} stroke={2} />
      </span>
      <span className="icon">
        <Icon name="scene" size={13} stroke={1.5} />
      </span>
      <span className="label">{scene.title}</span>

      {menu && (
        <ContextMenu items={menuItems} position={menu} onClose={() => setMenu(null)} />
      )}
    </div>
  );
}
