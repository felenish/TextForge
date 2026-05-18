import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  onSceneOpen: (sceneId: string, sceneTitle: string) => void;
}

export function AppLayout({ onSceneOpen }: AppLayoutProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: '#1e1e1e',
      color: '#d4d4d4',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar onSceneOpen={onSceneOpen} />
        <main style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#555',
          fontSize: '14px',
        }}>
          {/* SceneEditorArea mounts here in Phase 8 */}
          Open a scene from the Book Explorer
        </main>
      </div>
      <div style={{
        height: '22px',
        background: '#007acc',
        color: '#fff',
        fontSize: '12px',
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        TextForge Studio
      </div>
    </div>
  );
}
