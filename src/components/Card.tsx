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
    "relative overflow-hidden rounded-3xl border border-sand-300/70 bg-[#fff9f0] p-6 shadow-soft backdrop-blur before:absolute before:inset-0 before:bg-[linear-gradient(180deg,_rgba(255,255,255,0.6)_0%,_transparent_45%)] before:opacity-80 before:pointer-events-none after:absolute after:inset-3 after:rounded-2xl after:border after:border-dashed after:border-sand-200/70 after:opacity-60 dark:border-sand-800 dark:bg-sand-900/70 dark:before:bg-[linear-gradient(180deg,_rgba(255,255,255,0.08)_0%,_transparent_55%)] dark:after:border-sand-700/70",
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
