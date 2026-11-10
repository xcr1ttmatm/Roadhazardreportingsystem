import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'
import 'leaflet/dist/leaflet.css'

// Installable PWA. A newly deployed build is downloaded in the background and
// takes over on the next launch; the page you are on is never reloaded, so a
// report can't be lost mid-write.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
