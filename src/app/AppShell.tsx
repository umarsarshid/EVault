import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useVault } from './VaultContext'

type ThemeMode = 'light' | 'dark'

const navItems = [
  { label: 'Landing', to: '/' },
  { label: 'New vault', to: '/vault/new' },
  { label: 'Unlock', to: '/vault/unlock' },
  { label: 'Vault', to: '/vault' },
  { label: 'Capture', to: '/capture' },
  { label: 'Testimony', to: '/testimony' },
  { label: 'Export', to: '/export' },
]

const linkBase =
  'rounded-full px-3 py-1 text-xs font-medium transition hover:bg-sand-100 hover:text-sand-900 dark:hover:bg-sand-800 dark:hover:text-sand-100'

const THEME_KEY = 'evvault-theme'

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function AppShell() {
  const { vaultStatus, idleTimeoutMs, lockVault } = useVault()
  const isLocked = vaultStatus === 'locked'
  const idleMinutes = Math.round(idleTimeoutMs / 60000)
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const isDark = theme === 'dark'

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    window.localStorage.setItem(THEME_KEY, theme)
  }, [isDark, theme])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f6f1e7_45%,_#e8ddcc_100%)] dark:bg-[radial-gradient(circle_at_top,_#2a241d_0%,_#191612_45%,_#0f0d0a_100%)]">
      <div className="border-b border-sand-200 bg-sand-50 dark:border-sand-800 dark:bg-sand-900/40">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-2 text-xs">
          <div className="flex items-center gap-3">
            <span
              className={[
                'rounded-full px-2 py-1 font-semibold tracking-[0.2em]',
                isLocked
                  ? 'bg-sand-900 text-white dark:bg-sand-100 dark:text-sand-900'
                  : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
              ].join(' ')}
            >
              {vaultStatus.toUpperCase()}
            </span>
            <span className="text-sand-600 dark:text-sand-400">
              Auto-lock after {idleMinutes} min idle (placeholder)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isLocked && (
              <button
                type="button"
                className="rounded-full border border-sand-200 px-3 py-1 text-xs font-medium text-sand-700 transition hover:border-sand-400 dark:border-sand-700 dark:text-sand-300 dark:hover:border-sand-500"
                onClick={lockVault}
              >
                Lock
              </button>
            )}
            <button
              type="button"
              className="rounded-full border border-sand-200 px-3 py-1 text-xs font-medium text-sand-700 transition hover:border-sand-400 dark:border-sand-700 dark:text-sand-300 dark:hover:border-sand-500"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </div>
      </div>
      <header className="border-b border-sand-200 bg-white/80 backdrop-blur dark:border-sand-800 dark:bg-sand-900/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.32em] text-sand-600 dark:text-sand-400">
              Evidence Vault
            </span>
            <span className="text-lg font-semibold text-sand-900 dark:text-sand-50">
              App shell
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sand-700 dark:text-sand-300">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                    [
                      linkBase,
                      isActive
                        ? 'bg-sand-900 text-white hover:bg-sand-800 dark:bg-sand-100 dark:text-sand-900 dark:hover:bg-sand-200'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
