import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { db, type EvidenceItem } from '../db'
import { decryptBlob, encryptBlob } from '../crypto/blob'
import { appendCustodyEvent } from '../custody'
import RedactionCanvas, { type RedactionRect } from '../redact/RedactionCanvas'
import { pixelateImage } from '../redact/pixelate'
import { useVault } from './VaultContext'

type PreviewMode = 'original' | 'redacted'

export default function ItemDetail() {
  const { id } = useParams()
  const { vaultKey } = useVault()
  const [item, setItem] = useState<EvidenceItem | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [redactedUrl, setRedactedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rects, setRects] = useState<RedactionRect[]>([])
  const [redactionMessage, setRedactionMessage] = useState<string | null>(null)
  const [isSavingRedaction, setIsSavingRedaction] = useState(false)
  const [previewMode, setPreviewMode] = useState<PreviewMode>('original')

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
    let active = true

    const buildRedactedPreview = async () => {
      if (!item?.redactedBlob || !vaultKey) {
        setRedactedUrl(null)
        return
      }

      try {
        const blob = await decryptBlob(vaultKey, {
          nonce: item.redactedBlob.nonce,
          cipher: item.redactedBlob.cipher,
          mime: item.redactedMime ?? item.blobMime,
          size: item.redactedSize ?? item.blobSize,
        })

        if (!active) return

        const url = URL.createObjectURL(blob)
        setRedactedUrl(url)
      } catch (err) {
        console.error(err)
      }
    }

    void buildRedactedPreview()

    return () => {
      active = false
    }
  }, [item, vaultKey])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      if (redactedUrl) {
        URL.revokeObjectURL(redactedUrl)
      }
    }
  }, [previewUrl, redactedUrl])

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
      await appendCustodyEvent({
        itemId: item.id,
        action: 'redact',
        vaultKey,
        details: {
          method: 'pixelate',
          rectCount: rects.length,
        },
      })
      setPreviewMode('redacted')
      setRedactionMessage('Redacted copy saved.')
    } catch (err) {
      console.error(err)
      setRedactionMessage('Unable to save redacted copy.')
    } finally {
      setIsSavingRedaction(false)
    }
  }

  const canShowRedacted = Boolean(redactedUrl)
  const showingRedacted = previewMode === 'redacted'

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
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('original')}
                    className={[
                      'rounded-full border px-3 py-1 font-medium transition',
                      !showingRedacted
                        ? 'border-sand-900 bg-sand-900 text-white dark:border-sand-100 dark:bg-sand-100 dark:text-sand-900'
                        : 'border-sand-200 bg-white/60 text-sand-600 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-300',
                    ].join(' ')}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('redacted')}
                    disabled={!canShowRedacted}
                    className={[
                      'rounded-full border px-3 py-1 font-medium transition',
                      showingRedacted
                        ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950'
                        : 'border-sand-200 bg-white/60 text-sand-600 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-300',
                      !canShowRedacted ? 'opacity-50' : '',
                    ].join(' ')}
                  >
                    Redacted
                  </button>
                </div>

                {item.type === 'photo' && !showingRedacted && (
                  <RedactionCanvas
                    imageUrl={previewUrl}
                    initialRects={item.redaction?.rects}
                    onChange={setRects}
                  />
                )}
                {item.type === 'photo' && showingRedacted && redactedUrl && (
                  <img
                    src={redactedUrl}
                    alt={item.metadata.what || 'Redacted evidence'}
                    className="w-full rounded-2xl border border-sand-200 object-cover dark:border-sand-700"
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

                {item.type === 'photo' && !showingRedacted && (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={saveRedacted} disabled={isSavingRedaction}>
                      {isSavingRedaction ? 'Saving…' : 'Save redacted copy'}
                    </Button>
                    <span className="text-xs text-sand-600 dark:text-sand-400">
                      Pixelate the selected regions.
                    </span>
                  </div>
                )}
                {item.type === 'photo' && showingRedacted && (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-100">
                    Redaction is irreversible in exports unless you include originals.
                  </p>
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
