import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ensureStorageVersion } from './lib/app-version';
import App from './App.tsx';
import './index.css';

// Remover service workers antigos (evita cache de versões anteriores)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

// Proteção contra ChunkLoadError: recarregar quando chunk antigo não existe mais
const CHUNK_RELOAD_FLAG = 'cotapro_chunk_reload';

const isChunkLoadError = (err: unknown) =>
  err instanceof Error &&
  (err.name === 'ChunkLoadError' ||
    err.message?.includes('Loading chunk') ||
    err.message?.includes('Failed to fetch dynamically imported module'));

const handleChunkLoadError = () => {
  if (sessionStorage.getItem(CHUNK_RELOAD_FLAG)) return;
  sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
  window.location.reload();
};

window.addEventListener('error', (e) => {
  if (isChunkLoadError(e.error)) {
    e.preventDefault();
    handleChunkLoadError();
    return true;
  }
  return false;
});

window.addEventListener('unhandledrejection', (e) => {
  if (isChunkLoadError(e.reason)) {
    e.preventDefault();
    handleChunkLoadError();
    return true;
  }
  return false;
});

// Limpar storage antigo quando versão do app mudar
ensureStorageVersion();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
