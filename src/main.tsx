import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import HomeScreen from './pages/HomeScreen/HomeScreen.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HomeScreen />
  </StrictMode>,
)
