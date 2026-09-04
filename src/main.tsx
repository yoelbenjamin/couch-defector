import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from '@/App'
import { StoreProvider } from '@/lib/store'
import { Toaster } from '@/components/ui/sonner'
import { AgentationDev } from '@/dev/Agentation'
import { ProtoFrame, ProtoProvider } from '@/dev/proto'
import { ProtoController } from '@/dev/ProtoController'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProtoProvider>
        <StoreProvider>
          <ProtoFrame>
            <App />
          </ProtoFrame>
          <Toaster position="top-center" richColors />
          <AgentationDev />
          <ProtoController />
        </StoreProvider>
      </ProtoProvider>
    </BrowserRouter>
  </StrictMode>,
)
