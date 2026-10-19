import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { startTranslation } from './i18n/i18n';
import './styles.css';
import './simple.css';

const root = document.getElementById('root')!;
// The language dictionary loads first (the splash stays up meanwhile), so text never flashes in Spanish.
startTranslation(root)
  .catch(() => { /* untranslated is better than not starting */ })
  .finally(() => {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  });

// Installable app + instant repeat loads (production only, so dev always sees fresh code).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
