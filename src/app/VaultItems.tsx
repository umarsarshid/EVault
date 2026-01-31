import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { db, type EvidenceItem } from '../db'
import { useVault } from './VaultContext'

type FilterType = 'all' | EvidenceItem['type']

const filterOptions: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'Photo', value: 'photo' },
  { label: 'Video', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: 'Testimony', value: 'testimony' },
]

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

export default function VaultItems() {
  const { mode, vaultStatus, enterDemoMode, exitDemoMode, isSwitchingMode } = useVault()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const targetVaultParam = searchParams.get('vault') === 'demo' ? 'demo' : 'real'
  const [items, setItems] = useState<EvidenceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    if (targetVaultParam === 'demo' && mode !== 'demo') {
      enterDemoMode()
    }
    if (targetVaultParam === 'real' && mode !== 'real') {
      exitDemoMode()
    }
  }, [targetVaultParam, mode, enterDemoMode, exitDemoMode])

  useEffect(() => {
    let mounted = true

    const loadItems = async () => {
      setIsLoading(true)
      const records = await db.items.orderBy('createdAt').reverse().toArray()
      if (mounted) {
        setItems(records)
        setIsLoading(false)
      }
    }

    if (!isSwitchingMode) {
      void loadItems()
    }

    return () => {
      mounted = false
    }
  }, [mode, isSwitchingMode])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((item) => item.type === filter)
  }, [items, filter])

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-600 dark:text-sand-400">
          Vault items
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">
            {targetVaultParam === 'demo' ? 'Demo vault' : 'Primary vault'} items
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => navigate('/vault')}>
              Back to vaults
            </Button>
            <Button variant="outline" onClick={() => navigate('/capture')}>
              Capture media
            </Button>
          </div>
        </div>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Item list is tied to the active vault. Switch vaults via the vault list to see other
          workspaces.
        </p>
      </header>

      {vaultStatus === 'locked' ? (
        <Card
          title="Vault locked"
          description="Unlock the vault first to view decrypted items."
          footer={
            <Button onClick={() => navigate('/')}>Unlock vault</Button>
          }
        />
      ) : (
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
      )}
    </div>
  )
}
