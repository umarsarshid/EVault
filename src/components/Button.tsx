import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'outline' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const baseClasses =
  'inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-sand-900'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-sand-900 text-white shadow-soft hover:bg-sand-800 dark:bg-sand-100 dark:text-sand-900 dark:hover:bg-sand-200',
  outline:
    'border border-sand-200 text-sand-900 hover:border-sand-400 dark:border-sand-700 dark:text-sand-100 dark:hover:border-sand-500',
  ghost:
    'text-sand-700 hover:bg-sand-100 dark:text-sand-300 dark:hover:bg-sand-800',
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
