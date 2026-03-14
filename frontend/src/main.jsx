import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import router from './router.jsx'
import { AccessibilityProvider } from './components'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AccessibilityProvider>
      <RouterProvider router={router} />
    </AccessibilityProvider>
  </StrictMode>,
)
