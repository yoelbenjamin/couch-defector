import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from '@/App'
import { StoreProvider } from '@/lib/store'
import { Toaster } from '@/components/ui/sonner'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <App />
        <Toaster position="top-center" theme="dark" richColors />
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
