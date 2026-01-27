import { useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { encryptBlob } from '../crypto/blob'
import { db } from '../db'
import { useVault } from './VaultContext'

const createItemId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `item_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export default function Testimony() {
  const { vaultStatus, vaultKey } = useVault()
  const [what, setWhat] = useState('')
  const [when, setWhen] = useState('')
  const [where, setWhere] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const canSave =
    vaultStatus === 'unlocked' && vaultKey && what.trim() && when.trim() && where.trim()

  const handleSave = async () => {
    if (!vaultKey) {
      setMessage('Unlock the vault before saving.')
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const payload = {
        what: what.trim(),
        when: when.trim(),
        where: where.trim(),
        notes: notes.trim() || undefined,
      }

      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      const encrypted = await encryptBlob(vaultKey, blob)
      const now = Date.now()
      const parsedWhen = new Date(when).getTime()
      const capturedAt = Number.isNaN(parsedWhen) ? now : parsedWhen

      await db.items.add({
        id: createItemId(),
        type: 'testimony',
        createdAt: now,
        capturedAt,
        encryptedBlob: {
          nonce: encrypted.nonce,
          cipher: encrypted.cipher,
        },
        blobMime: encrypted.mime,
        blobSize: encrypted.size,
        metadata: {
          what: payload.what,
          where: payload.where,
          notes: payload.notes,
        },
      })

      setMessage('Testimony saved to the vault.')
      setWhat('')
      setWhen('')
      setWhere('')
      setNotes('')
    } catch (err) {
      console.error(err)
      setMessage('Unable to save testimony.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-600 dark:text-sand-400">
          Testimony
        </p>
        <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">
          Record written testimony
        </h1>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Capture a text-only account when media isn’t available.
        </p>
      </header>

      <Card title="Testimony" description="This will be encrypted and stored locally.">
        <div className="space-y-4">
          <Input placeholder="What happened?" value={what} onChange={(e) => setWhat(e.target.value)} />
          <Input
            type="datetime-local"
            placeholder="When did it happen?"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
          <Input placeholder="Where did it happen?" value={where} onChange={(e) => setWhere(e.target.value)} />
          <textarea
            rows={6}
            placeholder="Additional notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-900 shadow-[0_8px_30px_rgba(17,24,39,0.06)] placeholder:text-sand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-400 dark:border-sand-700 dark:bg-sand-900/70 dark:text-sand-100 dark:placeholder:text-sand-500"
          />
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={!canSave || isSaving}>
              {isSaving ? 'Saving…' : 'Save testimony'}
            </Button>
          </div>
          {message && (
            <p className="text-xs text-sand-600 dark:text-sand-400">{message}</p>
          )}
        </div>
      </Card>
    </div>
  )
}
