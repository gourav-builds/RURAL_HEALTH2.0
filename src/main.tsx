import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'

// Register service worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({
        onNeedRefresh() {
          // TODO M1+: show "New version available — reload?" toast
          console.info('[SW] New content available, reload to update.')
        },
        onOfflineReady() {
          console.info('[SW] App is ready to work offline.')
        },
      })
    }).catch(() => {
      // Dev mode without PWA plugin — ignore
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
