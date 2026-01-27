import { useEffect, useMemo, useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import { db, type EvidenceItem } from '../db'

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

export default function VaultList() {
  const [items, setItems] = useState<EvidenceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

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
  }, [])

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
              Your evidence
            </h1>
          </div>
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
        </div>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Items captured offline will appear here once the vault is unlocked.
        </p>
      </header>

      {isLoading ? (
        <Card title="Loading" description="Fetching your local evidence vault." />
      ) : filteredItems.length === 0 ? (
        <Card title="No evidence yet" description="Capture media or write testimony to begin.">
          <div className="flex flex-wrap gap-3">
            <Button>Capture</Button>
            <Button variant="outline">Testimony</Button>
            <Button variant="ghost">Export</Button>
          </div>
        </Card>
      ) : (
        <Card title={`${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'}`}>
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
                  <div className="text-xs text-sand-500 dark:text-sand-400">
                    {formatDate(item.capturedAt)}
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
        </Card>
      )}
    </div>
  )
}
