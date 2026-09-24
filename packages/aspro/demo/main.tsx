import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.js'
import '../src/styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
