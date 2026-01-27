import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App'
import { VaultProvider } from './app/VaultContext'
import { initSodium } from './crypto/sodium'
import './style.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

void initSodium()

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <VaultProvider>
        <App />
      </VaultProvider>
    </BrowserRouter>
  </StrictMode>
)
