import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SbcThemeProvider } from '@stackbuild/ui';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SbcThemeProvider>
      <App />
    </SbcThemeProvider>
  </StrictMode>,
);
