import { useState } from 'react';
import type { ChapterDto } from '../../api/books';
import { ContextMenu, type ContextMenuEntry } from '../ui/ContextMenu';
import { SceneNode } from './SceneNode';
import { Icon } from '../ui/Icon';

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

  const menuItems: ContextMenuEntry[] = [
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
        className="tree-row is-chapter"
        onClick={() => setExpanded(x => !x)}
        onContextMenu={e => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY }); }}
      >
        <span className={`chev${expanded ? ' open' : ''}`}>
          <Icon name="chev-right" size={12} stroke={2} />
        </span>
        <span className="icon">
          <Icon name="folder" size={13} stroke={1.5} />
        </span>
        <span className="label">{chapter.title}</span>
        <span className="meta-right">{chapter.scenes.length}</span>
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
