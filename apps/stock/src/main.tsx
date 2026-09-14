import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerServiceWorker } from '@stackbuild/ui';
import '../../attendance/src/styles/globals.css';
import App from './App';

registerServiceWorker(import.meta.env.PROD);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
