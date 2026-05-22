import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { ErrorBoundary } from 'react-error-boundary';

const ErrorFallback = ({error}: {error: Error}) => (
  <div style={{ padding: '20px', color: 'red', backgroundColor: '#000', height: '100vh' }}>
    <h2>Something went wrong in Vigil.AI:</h2>
    <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
    <pre style={{ fontSize: '10px' }}>{error.stack}</pre>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

