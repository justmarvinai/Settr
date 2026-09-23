import '@fontsource-variable/mona-sans/standard.css';
import '@fontsource-variable/geist-mono/wght.css';
import './styles/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { listenForInstall } from './features/pwa';

listenForInstall();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
