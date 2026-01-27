import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { db, type EvidenceItem } from '../db'
import { decryptBlob, encryptBlob } from '../crypto/blob'
import RedactionCanvas, { type RedactionRect } from '../redact/RedactionCanvas'
import { pixelateImage } from '../redact/pixelate'
import { useVault } from './VaultContext'

export default function ItemDetail() {
  const { id } = useParams()
  const { vaultKey } = useVault()
  const [item, setItem] = useState<EvidenceItem | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rects, setRects] = useState<RedactionRect[]>([])
  const [redactionMessage, setRedactionMessage] = useState<string | null>(null)
  const [isSavingRedaction, setIsSavingRedaction] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadItem = async () => {
      if (!id) {
        setError('Missing item id.')
        setIsLoading(false)
        return
      }

      const record = await db.items.get(id)
      if (mounted) {
        setItem(record ?? null)
        setIsLoading(false)
      }
    }

    void loadItem()

    return () => {
      mounted = false
    }
  }, [id])

  useEffect(() => {
    let active = true

    const buildPreview = async () => {
      if (!item || !vaultKey) return

      try {
        const blob = await decryptBlob(vaultKey, {
          nonce: item.encryptedBlob.nonce,
          cipher: item.encryptedBlob.cipher,
          mime: item.blobMime,
          size: item.blobSize,
        })

        if (!active) return

        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
      } catch (err) {
        console.error(err)
        if (active) {
          setError('Unable to decrypt item. Unlock the vault first.')
        }
      }
    }

    void buildPreview()

    return () => {
      active = false
    }
  }, [item, vaultKey])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const saveRedacted = async () => {
    if (!item || item.type !== 'photo') return
    if (!vaultKey) {
      setRedactionMessage('Unlock the vault before saving a redaction.')
      return
    }
    if (!previewUrl) {
      setRedactionMessage('Preview not available yet.')
      return
    }
    if (rects.length === 0) {
      setRedactionMessage('Draw at least one rectangle to pixelate.')
      return
    }

    try {
      setIsSavingRedaction(true)
      setRedactionMessage(null)

      const redactedBlob = await pixelateImage(previewUrl, rects, { mimeType: item.blobMime })
      const encrypted = await encryptBlob(vaultKey, redactedBlob)
      const now = Date.now()

      await db.items.update(item.id, {
        redactedBlob: {
          nonce: encrypted.nonce,
          cipher: encrypted.cipher,
        },
        redactedMime: encrypted.mime,
        redactedSize: encrypted.size,
        redaction: {
          method: 'pixelate',
          rects,
          createdAt: now,
        },
      })

      const updatedItem = {
        ...item,
        redactedBlob: {
          nonce: encrypted.nonce,
          cipher: encrypted.cipher,
        },
        redactedMime: encrypted.mime,
        redactedSize: encrypted.size,
        redaction: {
          method: 'pixelate',
          rects,
          createdAt: now,
        },
      }

      setItem(updatedItem)
      setRedactionMessage('Redacted copy saved.')
    } catch (err) {
      console.error(err)
      setRedactionMessage('Unable to save redacted copy.')
    } finally {
      setIsSavingRedaction(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-600 dark:text-sand-400">
          Evidence item
        </p>
        <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">
          Item {id ?? 'unknown'}
        </h1>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Review metadata, redact sensitive regions, and prepare for export.
        </p>
        <p className="text-xs text-sand-600 dark:text-sand-400">
          Unlocking is stored in memory only. Refreshing or opening this page directly will lock
          the vault again.
        </p>
      </header>

      {isLoading ? (
        <Card title="Loading" description="Decrypting evidence preview." />
      ) : error ? (
        <Card title="Unable to load" description={error} />
      ) : item ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card title="Preview" description="Decrypted in memory for viewing only.">
            {previewUrl ? (
              <div className="space-y-4">
                {item.type === 'photo' && (
                  <RedactionCanvas
                    imageUrl={previewUrl}
                    initialRects={item.redaction?.rects}
                    onChange={setRects}
                  />
                )}
                {item.type === 'video' && (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full rounded-2xl border border-sand-200 dark:border-sand-700"
                  />
                )}
                {item.type === 'audio' && <audio src={previewUrl} controls className="w-full" />}
                {item.type === 'photo' && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={saveRedacted} disabled={isSavingRedaction}>
                      {isSavingRedaction ? 'Saving…' : 'Save redacted copy'}
                    </Button>
                    <span className="text-xs text-sand-600 dark:text-sand-400">
                      Pixelate the selected regions.
                    </span>
                  </div>
                )}
                {redactionMessage && (
                  <p className="text-xs text-amber-700 dark:text-amber-200">{redactionMessage}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-sand-600 dark:text-sand-400">
                Unlock the vault to decrypt this item.
              </p>
            )}
          </Card>

          <Card title="Metadata" description="Captured details">
            <div className="space-y-3 text-sm text-sand-700 dark:text-sand-300">
              <div>
                <span className="font-semibold text-sand-900 dark:text-sand-50">What:</span>{' '}
                {item.metadata.what || '—'}
              </div>
              <div>
                <span className="font-semibold text-sand-900 dark:text-sand-50">When:</span>{' '}
                {new Date(item.capturedAt).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold text-sand-900 dark:text-sand-50">Where:</span>{' '}
                {item.metadata.where || '—'}
              </div>
              {item.metadata.notes && (
                <div>
                  <span className="font-semibold text-sand-900 dark:text-sand-50">Notes:</span>{' '}
                  {item.metadata.notes}
                </div>
              )}
              {item.location && (
                <div>
                  <span className="font-semibold text-sand-900 dark:text-sand-50">Location:</span>{' '}
                  {item.location.lat}, {item.location.lon}
                </div>
              )}
              {item.type === 'photo' && (
                <div>
                  <span className="font-semibold text-sand-900 dark:text-sand-50">Redactions:</span>{' '}
                  {rects.length} region{rects.length === 1 ? '' : 's'}
                </div>
              )}
              {item.redactedBlob && (
                <div>
                  <span className="font-semibold text-sand-900 dark:text-sand-50">
                    Redacted copy:
                  </span>{' '}
                  {item.redactedMime} · {Math.round((item.redactedSize ?? 0) / 1024)} KB
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline">Add notes</Button>
              <Button variant="ghost">Open redaction</Button>
            </div>
          </Card>
        </div>
      ) : (
        <Card title="Not found" description="No matching evidence item." />
      )}
    </div>
  )
}
