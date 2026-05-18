import { useEffect, useState } from 'react';
import { get } from './api/client';

interface HealthResponse {
  status: string;
}

function App() {
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get<HealthResponse>('/api/health')
      .then(data => setApiStatus(data.status))
      .catch(() => setError('Could not reach API'));
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>TextForge Studio</h1>
      {apiStatus !== null ? (
        <p>TextForge is running — API status: <strong>{apiStatus}</strong></p>
      ) : error !== null ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <p>Connecting…</p>
      )}
    </div>
  );
}

export default App;
