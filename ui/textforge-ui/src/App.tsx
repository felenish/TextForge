import { AppLayout } from './components/layout/AppLayout';

function App() {
  const handleSceneOpen = (sceneId: string, sceneTitle: string) => {
    console.log('Open scene:', sceneId, sceneTitle);
  };

  return <AppLayout onSceneOpen={handleSceneOpen} />;
}

export default App;
