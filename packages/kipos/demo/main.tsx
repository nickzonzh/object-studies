import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.js'
// The art is joined to the published stylesheet at build time (scripts/bundle-art.mjs).
import '../src/art.css'
import './app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
