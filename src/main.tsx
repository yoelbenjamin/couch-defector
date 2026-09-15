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

registerSW({
  immediate: true,
  // Without this, vite-plugin-pwa reloads the page the moment a new service worker activates, which
  // replays the whole startup and runs the load screen a second time on the first open after a
  // deploy. The new version is already cached by then, so it comes up on the next launch instead.
  onNeedReload: () => {},
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProtoProvider>
        <StoreProvider>
          <ProtoFrame>
            <App />
          </ProtoFrame>
          <Toaster />
          <AgentationDev />
          <ProtoController />
        </StoreProvider>
      </ProtoProvider>
    </BrowserRouter>
  </StrictMode>,
)
