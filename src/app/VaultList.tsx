import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { db, getVaultMetaForMode, type EvidenceItem, type VaultMeta, type VaultDbMode } from '../db'
import { useVault } from './VaultContext'

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

type FilterType = 'all' | EvidenceItem['type']

const filterOptions: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Photo', value: 'photo' },
  { label: 'Video', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: 'Testimony', value: 'testimony' },
]

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
  const location = useLocation()
  const [items, setItems] = useState<EvidenceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [metaByMode, setMetaByMode] = useState<Record<VaultDbMode, VaultMeta | null>>({
    real: null,
    demo: null,
  })

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const [showItems, setShowItems] = useState(searchParams.get('showItems') === 'true')
  const [itemsMode, setItemsMode] = useState<VaultDbMode>(
    (searchParams.get('vault') as VaultDbMode) === 'demo' ? 'demo' : 'real',
  )

  useEffect(() => {
    let active = true

    const loadMeta = async () => {
      const [realMeta, demoMeta] = await Promise.all([
        getVaultMetaForMode('real'),
        getVaultMetaForMode('demo'),
      ])
      if (!active) return
      setMetaByMode({
        real: realMeta ?? null,
        demo: demoMeta ?? null,
      })
    }

    void loadMeta()

    return () => {
      active = false
    }
  }, [mode, isSwitchingMode])

  useEffect(() => {
    const search = new URLSearchParams(location.search)
    const wantsItems = search.get('showItems') === 'true'
    const requestedMode = search.get('vault') === 'demo' ? 'demo' : 'real'
    setShowItems(wantsItems)
    setItemsMode(requestedMode)
  }, [location.search])

  useEffect(() => {
    let mounted = true

  const loadItems = async () => {
    const records = await db.items.orderBy('createdAt').reverse().toArray()
    if (mounted) {
      setItems(records)
      setIsLoading(false)
    }
  }

    void loadItems()

    return () => {
      mounted = false
    }
  }, [mode])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.type === filter)
  }, [items, filter])

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sand-600 dark:text-sand-400">
              Vault
            </p>
            <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">
              Vault list
            </h1>
          </div>
          <div className="text-sm text-sand-700 dark:text-sand-300">
            Active vault: {mode === 'demo' ? 'Demo vault' : 'Primary vault'} ({vaultStatus})
          </div>
        </div>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Manage vaults, switch the active workspace, and see where instant capture will be saved.
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
                <div className="flex items-center justify-between gap-2">
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
                    ? `Created ${formatDate(meta.createdAt)} · Updated ${formatDate(meta.updatedAt)}`
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
                  {!isActive && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        navigate(`/vault?showItems=true&vault=${vault.id}`)
                        if (vault.id === 'demo') {
                          enterDemoMode()
                        } else {
                          exitDemoMode()
                        }
                      }}
                      disabled={isSwitchingMode}
                    >
                      View items
                    </Button>
                  )}
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

      {canShowItems ? (
        <Card title={`${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'}`}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={[
                    'rounded-full border px-3 py-1 text-xs font-medium transition',
                    filter === option.value
                      ? 'border-sand-900 bg-sand-900 text-white dark:border-sand-100 dark:bg-sand-100 dark:text-sand-900'
                      : 'border-sand-200 bg-white/60 text-sand-600 hover:border-sand-400 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-300',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {isLoading ? (
              <div className="rounded-2xl border border-sand-200 bg-white/70 p-4 text-sm text-sand-700 dark:border-sand-700 dark:bg-sand-900/60">
                Loading items…
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="rounded-2xl border border-sand-200 bg-white/70 px-4 py-6 text-sm text-sand-700 dark:border-sand-700 dark:bg-sand-900/60">
                No evidence yet. Capture media to populate this vault.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-sand-200 bg-white/60 p-4 text-sm text-sand-700 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-300"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-sand-900 dark:text-sand-100">
                        {item.metadata?.what || 'Untitled capture'}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-sand-500 dark:text-sand-400">
                        <span>{formatDate(item.capturedAt)}</span>
                        <button
                          type="button"
                          onClick={() => navigate(`/item/${item.id}`)}
                          className="rounded-full border border-sand-200 px-2 py-1 text-xs font-medium text-sand-700 transition hover:border-sand-400 dark:border-sand-700 dark:text-sand-300 dark:hover:border-sand-500"
                        >
                          View
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span className="rounded-full border border-sand-200 px-2 py-1 dark:border-sand-700">
                        {item.type}
                      </span>
                      <span>
                        {item.blobMime} · {Math.round(item.blobSize / 1024)} KB
                      </span>
                      {item.metadata?.where && <span>Where: {item.metadata.where}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card
          title="Items hidden"
          description="View items by opening a vault via the cards above or the button in the header."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/vault?showItems=true&vault=${mode}`)}
              disabled={isSwitchingMode}
            >
              View items in {mode === 'demo' ? 'Demo' : 'Primary'} vault
            </Button>
            <p className="text-sm text-sand-600 dark:text-sand-300">
              Create vaults or switch to another workspace before inspecting evidence.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
