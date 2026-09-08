import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// Avoid React StrictMode double-mounting effects (duplicate search / drilldown API calls in dev).
createRoot(document.getElementById('root')!).render(<App />)
