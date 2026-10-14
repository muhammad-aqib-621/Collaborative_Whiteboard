import { forwardRef, type ButtonHTMLAttributes } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { cn } from '@/utils/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name, also shown in the tooltip. */
  label: string
  shortcut?: string
  /** Renders the pressed/toggled state. */
  active?: boolean
  tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, active, tooltipSide = 'top', className, children, ...rest },
  ref,
) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          aria-pressed={active}
          className={cn('icon-btn', className)}
          {...rest}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={tooltipSide} sideOffset={8} className="tooltip">
          {label}
          {shortcut && <span className="kbd">{shortcut}</span>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
})
