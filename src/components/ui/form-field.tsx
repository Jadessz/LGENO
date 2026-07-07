import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  hint: string
  htmlFor?: string
  optional?: boolean
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  hint,
  htmlFor,
  optional,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="space-y-1">
        <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-medium text-foreground">
          {label}
          {optional && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
              Optional
            </span>
          )}
        </label>
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <div className="mt-auto pt-2">{children}</div>
    </div>
  )
}
