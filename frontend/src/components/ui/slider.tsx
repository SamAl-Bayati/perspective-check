import { Slider as SliderPrimitive } from 'radix-ui'
import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn('relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 shrink-0 rounded-full border border-primary bg-background shadow-sm transition-shadow hover:ring-4 hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 disabled:pointer-events-none" />
    </SliderPrimitive.Root>
  )
}

export { Slider }
