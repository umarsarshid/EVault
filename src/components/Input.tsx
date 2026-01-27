import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export default function Input({ className, ...props }: InputProps) {
  const classes = [
    'w-full rounded-2xl border border-dashed border-sand-300/80 bg-[#fff9f0] px-4 py-3 text-sm text-sand-900 shadow-[0_10px_24px_rgba(36,26,20,0.08)] transition sm:py-3.5',
    'placeholder:text-sand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:border-amber-400',
    'dark:border-sand-700 dark:bg-sand-900/70 dark:text-sand-100 dark:placeholder:text-sand-500',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <input className={classes} {...props} />
}
