import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export default function Input({ className, ...props }: InputProps) {
  const classes = [
    'w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-900 shadow-[0_8px_30px_rgba(17,24,39,0.06)]',
    'placeholder:text-sand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-400',
    'dark:border-sand-700 dark:bg-sand-900/70 dark:text-sand-100 dark:placeholder:text-sand-500',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <input className={classes} {...props} />
}
