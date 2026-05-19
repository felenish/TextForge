import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { ToastProvider } from './contexts/ToastContext';
import { OutputProvider } from './contexts/OutputContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <WorkspaceProvider>
          <OutputProvider>
            <AppLayout />
          </OutputProvider>
        </WorkspaceProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
