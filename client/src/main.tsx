import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setScriptKey } from '@progress/kendo-licensing';
import './index.css';
import App from './App';

setScriptKey(import.meta.env.VITE_KENDO_LICENSE_KEY ?? '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
