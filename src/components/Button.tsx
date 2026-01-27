import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'outline' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.3em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-sand-900'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border border-sand-900/80 bg-sand-900 text-white shadow-[0_6px_0_rgba(36,26,20,0.6)] hover:-translate-y-0.5 hover:bg-sand-800 active:translate-y-0 dark:border-sand-200 dark:bg-sand-100 dark:text-sand-900 dark:shadow-[0_6px_0_rgba(248,243,234,0.4)]',
  outline:
    'border border-dashed border-sand-400/70 bg-white/70 text-sand-800 shadow-[0_10px_20px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:border-sand-500 hover:bg-white/90 active:translate-y-0 dark:border-sand-600 dark:bg-sand-900/60 dark:text-sand-100 dark:hover:border-sand-500 dark:hover:bg-sand-900/80',
  ghost:
    'text-sand-700 hover:bg-sand-100/80 hover:text-sand-900 dark:text-sand-300 dark:hover:bg-sand-800/70',
}

export default function Button({
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = [baseClasses, variantClasses[variant], className]
    .filter(Boolean)
    .join(' ')

  return <button type={type} className={classes} {...props} />
}
