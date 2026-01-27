import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string
  description?: string
}

export default function Card({
  title,
  description,
  className,
  children,
  ...props
}: CardProps) {
  const classes = [
    'rounded-3xl border border-sand-200 bg-white/85 p-6 shadow-soft backdrop-blur dark:border-sand-800 dark:bg-sand-900/70',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes} {...props}>
      {(title || description) && (
        <header className="space-y-1">
          {title && (
            <h2 className="text-lg font-semibold text-sand-900 dark:text-sand-50">
              {title}
            </h2>
          )}
          {description && <p className="text-sm text-sand-700 dark:text-sand-300">{description}</p>}
        </header>
      )}
      {children && <div className="mt-4">{children}</div>}
    </section>
  )
}
