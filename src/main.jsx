import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// ── Supabase health check (runs once on app load) ──
(async () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  console.log('[Supabase] URL:', url || '(not set)');
  console.log('[Supabase] Anon key present:', !!key);
  if (!url || !key) {
    console.warn('[Supabase] Missing env vars — backend calls will fail.');
    return;
  }
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      console.log('[Supabase] Connection OK — status', res.status);
    } else {
      const body = await res.text().catch(() => '(no body)');
      console.error(`[Supabase] Connection FAILED — status ${res.status}`, body);
    }
  } catch (err) {
    console.error('[Supabase] Connection ERROR:', err.message || err);
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
