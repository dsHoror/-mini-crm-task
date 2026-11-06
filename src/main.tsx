import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import './index.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element #root is missing')
}

createRoot(root).render(
  <StrictMode>
    <MantineProvider
      theme={{
        primaryColor: 'blue',
        defaultRadius: 'md',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        headings: {
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </MantineProvider>
  </StrictMode>,
)
