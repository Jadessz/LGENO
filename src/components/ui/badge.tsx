import { cn } from '@/lib/utils'

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-secondary text-secondary-foreground',
        variant === 'success' && 'bg-success/20 text-success',
        variant === 'warning' && 'bg-yellow-500/20 text-yellow-400',
        variant === 'destructive' && 'bg-destructive/20 text-destructive',
        className,
      )}
      {...props}
    />
  )
}
