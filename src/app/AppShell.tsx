import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Button from '../components/Button'
import { useVault } from './VaultContext'

type ThemeMode = 'light' | 'dark'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

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
  'relative rounded-full px-4 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.28em] transition hover:-translate-y-0.5 hover:bg-sand-100 hover:text-sand-900 dark:hover:bg-sand-800 dark:hover:text-sand-100 font-mono sm:text-[0.6rem]'

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
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    window.localStorage.setItem(THEME_KEY, theme)
  }, [isDark, theme])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error navigator.standalone is iOS-specific
      (window.navigator && window.navigator.standalone)

    if (isStandalone) {
      setIsInstalled(true)
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  return (
    <div className="min-h-screen text-sand-900 dark:text-sand-50">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-20 right-[-6rem] h-72 w-72 rounded-full bg-amber-200/35 blur-3xl dark:bg-amber-500/15 ev-float" />
        <div className="absolute bottom-[-10rem] left-[-5rem] h-72 w-72 rounded-full bg-sand-300/30 blur-3xl dark:bg-sand-700/20 ev-float" />
      </div>

      <div className="border-b border-sand-300/70 bg-white/70 backdrop-blur dark:border-sand-800/70 dark:bg-sand-900/40">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs sm:px-6">
          <div className="flex items-center gap-3">
            <span className="ev-label text-[0.55rem] text-sand-500 dark:text-sand-400">
              Evidence Vault
            </span>
            <span className="hidden h-1.5 w-1.5 rounded-full bg-amber-400 sm:inline-block" />
            <span
              className={[
                'rounded-full px-3 py-1 text-[0.52rem] font-semibold uppercase tracking-[0.22em] font-mono',
                isLocked
                  ? 'bg-sand-900 text-white dark:bg-sand-100 dark:text-sand-900'
                  : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
              ].join(' ')}
            >
              {vaultStatus.toUpperCase()}
            </span>
            <span className="hidden text-sand-500 dark:text-sand-400 sm:inline">
              Auto-lock after {idleMinutes} min idle
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isLocked && (
              <button
                type="button"
                className="rounded-full border border-dashed border-sand-400/70 bg-white/60 px-3 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-sand-700 transition hover:-translate-y-0.5 hover:border-sand-500 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-200 dark:hover:border-sand-500"
                onClick={lockVault}
              >
                Quick lock
              </button>
            )}
            <button
              type="button"
              className="rounded-full border border-dashed border-sand-400/70 bg-white/60 px-3 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-sand-700 transition hover:-translate-y-0.5 hover:border-sand-500 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-200 dark:hover:border-sand-500"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </div>
      </div>

      <header className="border-b border-sand-300/70 bg-white/80 backdrop-blur dark:border-sand-800/70 dark:bg-sand-900/70">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-1">
            <span className="ev-label text-[0.6rem] text-sand-500 dark:text-sand-400">
              Evidence Vault
            </span>
            <span className="ev-hairline text-2xl font-semibold text-sand-900 dark:text-sand-50">
              Offline evidence workspace
            </span>
            <span className="text-xs text-sand-500 dark:text-sand-400">
              Built for zero-connectivity capture and forensic-ready export.
            </span>
          </div>
          <nav className="no-scrollbar flex max-w-full items-center gap-2 overflow-x-auto rounded-full border border-dashed border-sand-300/70 bg-white/70 p-1 text-sand-700 shadow-[0_16px_32px_rgba(36,26,20,0.08)] dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-300">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                    [
                      linkBase,
                      isActive
                        ? 'bg-sand-900 text-white shadow-[0_12px_24px_rgba(36,26,20,0.2)] hover:bg-sand-800 dark:bg-sand-100 dark:text-sand-900 dark:hover:bg-white'
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
      {installPrompt && !isInstalled && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-dashed border-sand-300/70 bg-white/70 px-4 py-4 text-sand-700 shadow-[0_14px_30px_rgba(36,26,20,0.08)] dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-200 sm:px-6">
            <div className="space-y-1">
              <p className="ev-label text-[0.55rem] text-sand-500 dark:text-sand-400">
                Install Evidence Vault
              </p>
              <p className="text-sm text-sand-700 dark:text-sand-200">
                Add the app to your home screen for offline access.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleInstallClick}>Install Evidence Vault</Button>
              <button
                type="button"
                className="rounded-full border border-dashed border-sand-400/70 bg-white/60 px-4 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-sand-700 transition hover:-translate-y-0.5 hover:border-sand-500 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-200 dark:hover:border-sand-500"
                onClick={() => setInstallPrompt(null)}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 ev-fade-up">
        <Outlet />
      </main>
    </div>
  )
}
