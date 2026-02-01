import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// ← ESTA LÍNEA ES CRÍTICA
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)