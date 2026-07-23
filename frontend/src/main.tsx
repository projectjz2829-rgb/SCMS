import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Recover from Vite chunk hash mismatches after a new deployment.
// Only reload once per session to prevent infinite loops.
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message ?? ''
  const isChunkError =
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk')
  if (!isChunkError) return

  if (sessionStorage.getItem('chunk_reload_attempted')) return

  sessionStorage.setItem('chunk_reload_attempted', '1')
  window.location.reload()
})

// Clear the reload flag once the app boots successfully (this line runs on every load).
sessionStorage.removeItem('chunk_reload_attempted')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
