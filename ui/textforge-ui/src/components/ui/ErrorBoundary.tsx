import { Component, type ReactNode } from 'react';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '16px',
          background: '#1e1e1e',
          color: '#d4d4d4',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}>
          <div style={{ fontSize: '16px', color: '#f48771' }}>Something went wrong.</div>
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
        </div>
      );
    }
    return this.props.children;
  }
}
