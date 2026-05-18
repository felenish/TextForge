import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { AppLayout } from './components/layout/AppLayout';

function App() {
  return (
    <WorkspaceProvider>
      <AppLayout />
    </WorkspaceProvider>
  );
}

export default App;
