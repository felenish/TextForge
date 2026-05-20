import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { ToastProvider } from './contexts/ToastContext';
import { OutputProvider } from './contexts/OutputContext';
import { DialogProvider } from './contexts/DialogContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <DialogProvider>
          <WorkspaceProvider>
            <OutputProvider>
              <AppLayout />
            </OutputProvider>
          </WorkspaceProvider>
        </DialogProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
