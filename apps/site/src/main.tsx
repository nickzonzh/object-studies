import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'kimolia/style.css'
import 'melani/style.css'
import 'korniza/style.css'
import 'keramos/style.css'
import 'kollaz/style.css'
import './site.css'
import { App } from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
