import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import router from './router.jsx'
import { AccessibilityProvider } from './components'
import { ThemeProvider } from './contexts/ThemeContext'
import PWAManager from './components/PWAManager'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <PWAManager>
        <AccessibilityProvider>
          <RouterProvider router={router} />
        </AccessibilityProvider>
      </PWAManager>
    </ThemeProvider>
  </StrictMode>,
)
