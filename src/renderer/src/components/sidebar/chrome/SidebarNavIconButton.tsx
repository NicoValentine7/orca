import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/class-names'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type SidebarNavIconButtonProps = Omit<React.ComponentProps<'button'>, 'children'> & {
  icon: LucideIcon
  label: string
  active?: boolean
  tooltipExtra?: React.ReactNode
  badge?: boolean
}

export function SidebarNavIconButton({
  icon: Icon,
  label,
  active = false,
  tooltipExtra,
  badge = false,
  className,
  ...buttonProps
}: SidebarNavIconButtonProps): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          {...buttonProps}
          className={cn(
            'relative flex size-8 shrink-0 items-center justify-center rounded-md transition-colors',
            active
              ? 'bg-worktree-sidebar-accent text-worktree-sidebar-accent-foreground'
              : 'text-worktree-sidebar-foreground/45 hover:bg-worktree-sidebar-foreground/8 hover:text-worktree-sidebar-foreground/80',
            className
          )}
        >
          <Icon className="size-4" strokeWidth={active ? 2.25 : 1.75} />
          {badge ? (
            <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        <span className="flex items-center gap-2">
          {label}
          {tooltipExtra}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}
