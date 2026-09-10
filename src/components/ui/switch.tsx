import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default'
}) {
  return (
    <SwitchPrimitive.Root data-slot="switch" data-size={size} className={cn('ws-switch peer shrink-0', className)} {...props}>
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className="ws-switch-thumb" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
