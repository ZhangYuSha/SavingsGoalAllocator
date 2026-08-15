import { StrictMode } from 'react'

import {
  createRoot,
} from 'react-dom/client'

import {
  BrowserRouter,
} from 'react-router-dom'

import './index.css'

import App from './App'

/**
 * Creates the React application root and
 * renders the application inside BrowserRouter.
 *
 * BrowserRouter enables client-side routing,
 * while StrictMode helps identify potential
 * problems during development.
 */
createRoot(
  document.getElementById('root')!
).render(

  <StrictMode>

    {/* Enables routing throughout the application. */}
    <BrowserRouter>

      {/* Main application component. */}
      <App />

    </BrowserRouter>

  </StrictMode>
)