import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadDemoVault } from '../demo/demoVault'
import { setActiveDb, type VaultDbMode } from '../db'

type VaultStatus = 'locked' | 'unlocked'

type VaultContextValue = {
  vaultStatus: VaultStatus
  vaultKey: Uint8Array | null
  setVaultKey: (key: Uint8Array | null) => void
  setVaultStatus: (status: VaultStatus) => void
  lockVault: () => void
  idleTimeoutMs: number
  lastActivityAt: number
  resetIdleTimer: () => void
  mode: VaultDbMode
  isDemoMode: boolean
  isSwitchingMode: boolean
  enterDemoMode: () => void
  exitDemoMode: () => void
}

const VaultContext = createContext<VaultContextValue | null>(null)

const IDLE_TIMEOUT_MS = 5 * 60 * 1000
const IDLE_CHECK_INTERVAL_MS = 15 * 1000
const activityEvents = ['pointerdown', 'keydown', 'mousemove', 'touchstart', 'focus']
const MODE_KEY = 'evvault-mode'

const getInitialMode = (): VaultDbMode => {
  if (typeof window === 'undefined') return 'real'
  const stored = window.localStorage.getItem(MODE_KEY)
  return stored === 'demo' ? 'demo' : 'real'
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>('locked')
  const [vaultKey, setVaultKeyState] = useState<Uint8Array | null>(null)
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now())
  const [mode, setMode] = useState<VaultDbMode>(() => getInitialMode())
  const [isSwitchingMode, setIsSwitchingMode] = useState(false)

  const resetIdleTimer = useCallback(() => {
    setLastActivityAt(Date.now())
  }, [])

  const setVaultKey = useCallback((key: Uint8Array | null) => {
    setVaultKeyState(key)
  }, [])

  const lockVault = useCallback(() => {
    if (vaultKey) {
      vaultKey.fill(0)
    }
    setVaultKeyState(null)
    setVaultStatus('locked')
  }, [vaultKey])

  const enterDemoMode = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MODE_KEY, 'demo')
    }
    lockVault()
    setMode('demo')
  }, [lockVault])

  const exitDemoMode = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MODE_KEY, 'real')
    }
    lockVault()
    setMode('real')
  }, [lockVault])

  useEffect(() => {
    const handleActivity = () => resetIdleTimer()

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity)
    })

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity)
      })
    }
  }, [resetIdleTimer])

  useEffect(() => {
    let active = true

    const loadDemo = async () => {
      setIsSwitchingMode(true)
      try {
        setActiveDb('demo')
        const key = await loadDemoVault()
        if (!active) return
        setVaultKeyState(key)
        setVaultStatus('unlocked')
        resetIdleTimer()
      } catch (err) {
        console.error(err)
      } finally {
        if (active) {
          setIsSwitchingMode(false)
        }
      }
    }

    if (mode === 'demo') {
      void loadDemo()
    } else {
      setActiveDb('real')
    }

    return () => {
      active = false
    }
  }, [mode, resetIdleTimer])

  useEffect(() => {
    if (vaultStatus !== 'unlocked') return

    const intervalId = window.setInterval(() => {
      const idleFor = Date.now() - lastActivityAt
      if (idleFor >= IDLE_TIMEOUT_MS) {
        lockVault()
      }
    }, IDLE_CHECK_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [vaultStatus, lastActivityAt, lockVault])

  const value = useMemo(
    () => ({
      vaultStatus,
      vaultKey,
      setVaultKey,
      setVaultStatus,
      lockVault,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
      lastActivityAt,
      resetIdleTimer,
      mode,
      isDemoMode: mode === 'demo',
      isSwitchingMode,
      enterDemoMode,
      exitDemoMode,
    }),
    [
      vaultStatus,
      vaultKey,
      setVaultKey,
      lockVault,
      lastActivityAt,
      resetIdleTimer,
      mode,
      isSwitchingMode,
      enterDemoMode,
      exitDemoMode,
    ]
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault() {
  const context = useContext(VaultContext)

  if (!context) {
    throw new Error('useVault must be used within VaultProvider')
  }

  return context
}
