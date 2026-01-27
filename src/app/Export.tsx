import { useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import { db } from '../db'
import { appendCustodyEvent } from '../custody'
import { useVault } from './VaultContext'

const createExportId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `export_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export default function Export() {
  const { vaultStatus, vaultKey } = useVault()
  const [message, setMessage] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (vaultStatus !== 'unlocked' || !vaultKey) {
      setMessage('Unlock the vault before exporting.')
      return
    }

    setIsExporting(true)
    setMessage(null)

    try {
      const items = await db.items.toArray()
      if (items.length === 0) {
        setMessage('No items to export yet.')
        return
      }

      const exportId = createExportId()
      for (const item of items) {
        await appendCustodyEvent({
          itemId: item.id,
          action: 'export',
          vaultKey,
          details: {
            exportId,
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
          Generate a ZIP with originals, redactions, a manifest, and verification file.
        </p>
      </header>
      <Card title="Bundle settings" description="Pick what to include in the export.">
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Building…' : 'Build ZIP bundle'}
          </Button>
          <Button variant="outline">Review manifest</Button>
        </div>
        {message && (
          <p className="mt-3 text-xs text-sand-600 dark:text-sand-400">{message}</p>
        )}
      </Card>
    </div>
  )
}
