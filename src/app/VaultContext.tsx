import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type VaultStatus = 'locked' | 'unlocked'

type VaultContextValue = {
  vaultStatus: VaultStatus
  setVaultStatus: (status: VaultStatus) => void
  idleTimeoutMs: number
  lastActivityAt: number
  resetIdleTimer: () => void
}

const VaultContext = createContext<VaultContextValue | null>(null)

const IDLE_TIMEOUT_MS = 5 * 60 * 1000
const activityEvents = ['pointerdown', 'keydown', 'mousemove', 'touchstart', 'focus']

export function VaultProvider({ children }: { children: ReactNode }) {
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>('locked')
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now())

  const resetIdleTimer = useCallback(() => {
    setLastActivityAt(Date.now())
  }, [])

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
    if (vaultStatus !== 'unlocked') return

    // Placeholder auto-lock: after inactivity, return to locked state.
    const timeoutId = window.setTimeout(() => {
      setVaultStatus('locked')
    }, IDLE_TIMEOUT_MS)

    return () => window.clearTimeout(timeoutId)
  }, [vaultStatus, lastActivityAt])

  const value = useMemo(
    () => ({
      vaultStatus,
      setVaultStatus,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
      lastActivityAt,
      resetIdleTimer,
    }),
    [vaultStatus, lastActivityAt, resetIdleTimer]
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
