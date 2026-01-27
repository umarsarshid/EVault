import { useEffect, useMemo, useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import { db, type EvidenceItem } from '../db'
import { appendCustodyEvent } from '../custody'
import { useVault } from './VaultContext'

type OutputMode = 'review' | 'encrypted'

const createExportId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `export_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

export default function Export() {
  const { vaultStatus, vaultKey } = useVault()
  const [items, setItems] = useState<EvidenceItem[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [includeOriginals, setIncludeOriginals] = useState(true)
  const [includeRedacted, setIncludeRedacted] = useState(true)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [outputMode, setOutputMode] = useState<OutputMode>('review')
  const [message, setMessage] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadItems = async () => {
      const records = await db.items.orderBy('createdAt').reverse().toArray()
      if (mounted) {
        setItems(records)
        setSelectedIds(records.map((item) => item.id))
        setIsLoading(false)
      }
    }

    void loadItems()

    return () => {
      mounted = false
    }
  }, [])

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  )

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    )
  }

  const selectAll = () => setSelectedIds(items.map((item) => item.id))
  const clearAll = () => setSelectedIds([])

  const handleExport = async () => {
    if (vaultStatus !== 'unlocked' || !vaultKey) {
      setMessage('Unlock the vault before exporting.')
      return
    }

    if (selectedItems.length === 0) {
      setMessage('Select at least one item to export.')
      return
    }

    if (!includeOriginals && !includeRedacted && !includeMetadata) {
      setMessage('Choose at least one export component.')
      return
    }

    setIsExporting(true)
    setMessage(null)

    try {
      const exportId = createExportId()
      for (const item of selectedItems) {
        await appendCustodyEvent({
          itemId: item.id,
          action: 'export',
          vaultKey,
          details: {
            exportId,
            includeOriginals,
            includeRedacted,
            includeMetadata,
            outputMode,
            hasRedacted: Boolean(item.redactedBlob),
          },
        })
      }

      setMessage('Export placeholder complete. Custody events logged.')
    } catch (err) {
      console.error(err)
      setMessage('Failed to log export events.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-600 dark:text-sand-400">
          Export
        </p>
        <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">
          Prepare an export bundle
        </h1>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Choose items and bundle options. Default output is a reviewable decrypted bundle.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card title="Choose items" description="Select evidence to include in this export.">
          {isLoading ? (
            <p className="text-sm text-sand-600 dark:text-sand-400">Loading items…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-sand-600 dark:text-sand-400">No items yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Button variant="outline" onClick={selectAll}>
                  Select all
                </Button>
                <Button variant="ghost" onClick={clearAll}>
                  Clear
                </Button>
                <span className="text-sand-600 dark:text-sand-400">
                  {selectedItems.length} selected
                </span>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-sand-200 bg-white/60 p-3 text-sm text-sand-700 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-300"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="mt-1 h-4 w-4 accent-sand-900 dark:accent-sand-100"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-sand-900 dark:text-sand-100">
                          {item.metadata?.what || 'Untitled capture'}
                        </span>
                        <span className="text-xs text-sand-500 dark:text-sand-400">
                          {formatDate(item.capturedAt)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-sand-200 px-2 py-0.5 dark:border-sand-700">
                          {item.type}
                        </span>
                        <span>
                          {item.blobMime} · {Math.round(item.blobSize / 1024)} KB
                        </span>
                        {item.redactedBlob && (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100">
                            Redacted available
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Include" description="Choose which assets to bundle.">
            <div className="space-y-3 text-sm text-sand-700 dark:text-sand-300">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={includeOriginals}
                  onChange={(event) => setIncludeOriginals(event.target.checked)}
                  className="h-4 w-4 accent-sand-900 dark:accent-sand-100"
                />
                Originals
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={includeRedacted}
                  onChange={(event) => setIncludeRedacted(event.target.checked)}
                  className="h-4 w-4 accent-sand-900 dark:accent-sand-100"
                />
                Redacted copies
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(event) => setIncludeMetadata(event.target.checked)}
                  className="h-4 w-4 accent-sand-900 dark:accent-sand-100"
                />
                Metadata
              </label>
            </div>
          </Card>

          <Card title="Output mode" description="Choose how the bundle is packaged.">
            <div className="space-y-3 text-sm text-sand-700 dark:text-sand-300">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="outputMode"
                  value="review"
                  checked={outputMode === 'review'}
                  onChange={() => setOutputMode('review')}
                  className="h-4 w-4 accent-sand-900 dark:accent-sand-100"
                />
                Review bundle (decrypted)
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="outputMode"
                  value="encrypted"
                  checked={outputMode === 'encrypted'}
                  onChange={() => setOutputMode('encrypted')}
                  className="h-4 w-4 accent-sand-900 dark:accent-sand-100"
                />
                Encrypted bundle
              </label>
            </div>
          </Card>

          <Card title="Actions" description="Build the export bundle.">
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? 'Building…' : 'Build ZIP bundle'}
              </Button>
              <Button variant="outline" disabled={selectedItems.length === 0}>
                Review manifest
              </Button>
            </div>
            {message && (
              <p className="mt-3 text-xs text-sand-600 dark:text-sand-400">{message}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
