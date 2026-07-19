import * as SheetPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { forwardRef, type ComponentProps, type ComponentRef } from 'react'

import { cn } from '@/lib/utils'

function Sheet(props: ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

const SheetTrigger = forwardRef<
  ComponentRef<typeof SheetPrimitive.Trigger>,
  ComponentProps<typeof SheetPrimitive.Trigger>
>((props, ref) => <SheetPrimitive.Trigger ref={ref} data-slot="sheet-trigger" {...props} />)

SheetTrigger.displayName = 'SheetTrigger'

function SheetPortal(props: ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

const SheetOverlay = forwardRef<
  ComponentRef<typeof SheetPrimitive.Overlay>,
  ComponentProps<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    data-slot="sheet-overlay"
    className={cn(
      'fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out',
      className
    )}
    {...props}
  />
))

SheetOverlay.displayName = 'SheetOverlay'

function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'top' | 'right' | 'bottom' | 'left'
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'fixed z-50 flex flex-col gap-4 border bg-background shadow-lg transition data-[state=open]:animate-in data-[state=closed]:animate-out',
          side === 'right' && 'inset-y-0 right-0 h-full w-4/5 border-l sm:max-w-sm',
          side === 'left' && 'inset-y-0 left-0 h-full w-4/5 border-r sm:max-w-sm',
          side === 'top' && 'inset-x-0 top-0 border-b',
          side === 'bottom' && 'inset-x-0 bottom-0 border-t',
          className
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close inspector"
        >
          <X className="size-4" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 p-4 text-left', className)} {...props} />
}

function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title className={cn('text-base font-semibold', className)} {...props} />
  )
}

function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
}
