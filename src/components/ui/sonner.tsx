import { Check, Info, Loader2, TriangleAlert, X } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/** Bottom-of-page toasts in the app's own inset-card recipe. Light only. */
const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    position="bottom-center"
    offset={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    mobileOffset={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', left: 16, right: 16 }}
    gap={10}
    duration={3200}
    icons={{
      success: <Check className="size-4" strokeWidth={2.5} />,
      info: <Info className="size-4" />,
      warning: <TriangleAlert className="size-4" />,
      error: <X className="size-4" strokeWidth={2.5} />,
      loading: <Loader2 className="size-4 animate-spin" />,
    }}
    toastOptions={{
      unstyled: true,
      classNames: {
        toast: 'ws-toast',
        icon: 'ws-toast-icon',
        content: 'ws-toast-content',
        title: 'ws-toast-title',
        description: 'ws-toast-desc',
      },
    }}
    {...props}
  />
)

export { Toaster }
