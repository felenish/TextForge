import { Component, type ReactNode } from 'react';
import { logError } from '../../lib/logger';

interface State {
  hasError: boolean;
  error: Error | null;
  stack: string | null;
  detailsOpen: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null, stack: null, detailsOpen: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.setState({ stack: info.componentStack });
    logError(error.message, error.stack, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const { error, stack, detailsOpen } = this.state;
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '12px',
          background: '#1e1e1e',
          color: '#d4d4d4',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          padding: '24px',
          boxSizing: 'border-box',
        }}>
          <div style={{ fontSize: '16px', color: '#f48771' }}>Something went wrong.</div>
          {error && (
            <div style={{ fontSize: '13px', color: '#ce9178', maxWidth: 600, textAlign: 'center' }}>
              {error.message}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '6px 18px',
                background: '#0e639c',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Reload
            </button>
            {(error || stack) && (
              <button
                onClick={() => this.setState(s => ({ detailsOpen: !s.detailsOpen }))}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: '#9cdcfe',
                  border: '1px solid #3c3c3c',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {detailsOpen ? 'Hide Details' : 'Show Details'}
              </button>
            )}
          </div>
          {detailsOpen && (
            <pre style={{
              marginTop: '8px',
              padding: '12px',
              background: '#252526',
              border: '1px solid #3c3c3c',
              borderRadius: '3px',
              fontSize: '11px',
              color: '#d4d4d4',
              maxWidth: 700,
              maxHeight: 320,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              textAlign: 'left',
            }}>
              {error?.stack ?? error?.message}
              {stack && `\n\nComponent Stack:${stack}`}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
