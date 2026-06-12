import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Managed Progressive Web App (PWA) Service Worker Registration
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Dynamically unregister any dev service workers to avoid local Vite HMR caching conflicts
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('Successfully unregistered local development Service Worker.');
          }
        });
      }
    });
  } else {
    // Register PWA service worker only in production
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
        .then((reg) => {
          console.log('Progressive Web App SW registered on scope: ', reg.scope);
        })
        .catch((err) => {
          console.error('Progressive Web App SW registration failed: ', err);
        });
    });
  }
}
