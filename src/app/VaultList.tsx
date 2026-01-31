import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { getVaultMetaForMode, type VaultDbMode, type VaultMeta } from '../db'
import { useVault } from './VaultContext'

const vaultDefinitions: { id: VaultDbMode; title: string; description: string }[] = [
  { id: 'real', title: 'Primary vault', description: 'Your official evidence workspace.' },
  { id: 'demo', title: 'Demo vault', description: 'Sandbox data for safe walkthroughs.' },
]

export default function VaultList() {
  const {
    mode,
    vaultStatus,
    enterDemoMode,
    exitDemoMode,
    isSwitchingMode,
  } = useVault()
  const navigate = useNavigate()
  const [metaByMode, setMetaByMode] = useState<Record<VaultDbMode, VaultMeta | null>>({
    real: null,
    demo: null,
  })

  useEffect(() => {
    let active = true

    const loadMeta = async () => {
      const [realMeta, demoMeta] = await Promise.all([
        getVaultMetaForMode('real'),
        getVaultMetaForMode('demo'),
      ])
      if (!active) return
      setMetaByMode({ real: realMeta ?? null, demo: demoMeta ?? null })
    }

    void loadMeta()

    return () => {
      active = false
    }
  }, [isSwitchingMode])

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sand-600 dark:text-sand-400">
              Vault
            </p>
            <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">Vault list</h1>
          </div>
          <div className="text-sm text-sand-700 dark:text-sand-300">
            Active vault: {mode === 'demo' ? 'Demo vault' : 'Primary vault'} ({vaultStatus})
          </div>
        </div>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Manage vaults, switch the active workspace, and access items from the active vault.
        </p>
      </header>

      <Card title="Available vaults" description="Switch between vaults or create a new one.">
        <div className="grid gap-4 lg:grid-cols-2">
          {vaultDefinitions.map((vault) => {
            const meta = metaByMode[vault.id]
            const isActive = mode === vault.id
            const label = meta?.vaultName ?? vault.title
            return (
              <div
                key={vault.id}
                className="rounded-2xl border border-sand-200 bg-white/70 p-4 text-sm text-sand-700 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-sand-500 dark:text-sand-400">
                      {vault.description}
                    </p>
                    <p className="text-lg font-semibold text-sand-900 dark:text-sand-50">{label}</p>
                  </div>
                  <span
                    className={[
                      'rounded-full px-3 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.2em] font-mono',
                      isActive
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
                        : 'bg-sand-100 text-sand-600 dark:bg-sand-900/40 dark:text-sand-300',
                    ].join(' ')}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-sand-600 dark:text-sand-400">
                  {meta
                    ? `Created ${new Date(meta.createdAt).toLocaleString()} · Updated ${new Date(
                        meta.updatedAt,
                      ).toLocaleString()}`
                    : 'Vault metadata not available yet.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    variant={isActive ? 'primary' : 'outline'}
                    onClick={() => {
                      if (isActive) return
                      if (vault.id === 'demo') {
                        enterDemoMode()
                      } else {
                        exitDemoMode()
                      }
                    }}
                    disabled={isActive || isSwitchingMode}
                  >
                    {isActive ? 'Active vault' : 'Make active'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (vault.id === 'demo') {
                        enterDemoMode()
                      } else {
                        exitDemoMode()
                      }
                      navigate(`/vault/items?vault=${vault.id}`)
                    }}
                    disabled={isSwitchingMode}
                  >
                    View items
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card
        title="Instant capture destination"
        description="Capture media instantly and it will land in the active vault."
      >
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm text-sand-700 dark:text-sand-300">
            Instant captures are routed to the {mode === 'demo' ? 'Demo vault' : 'Primary vault'}.
          </p>
          <Button onClick={() => navigate('/capture')}>Start instant capture</Button>
          <Button variant="outline" onClick={() => navigate('/vault/new')}>
            Create vault
          </Button>
        </div>
      </Card>
    </div>
  )
}
