import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { db, type CustodyEvent, type EvidenceItem } from '../db'
import { decryptBlob, encryptBlob } from '../crypto/blob'
import { detectFaces } from '../ai/faceDetector'
import { detectFacesInWorker } from '../ai/faceDetectWorker'
import RedactionCanvas, { type RedactionRect } from '../redact/RedactionCanvas'
import { pixelateImage } from '../redact/pixelate'
import { appendCustodyEvent } from '../custody'
import { useVault } from './VaultContext'

type PreviewMode = 'original' | 'redacted'

const FACE_MODEL_VERSION = 'face_detector.task'

type FaceSuggestion = {
  id: string
  rect: RedactionRect
  score: number
  included: boolean
}

const formatEventTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

const truncateHash = (hash?: string) => {
  if (!hash) return '—'
  return `${hash.slice(0, 12)}…${hash.slice(-6)}`
}

export default function ItemDetail() {
  const { id } = useParams()
  const { vaultKey } = useVault()
  const [item, setItem] = useState<EvidenceItem | null>(null)
  const [events, setEvents] = useState<CustodyEvent[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [redactedUrl, setRedactedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rects, setRects] = useState<RedactionRect[]>([])
  const [redactionMessage, setRedactionMessage] = useState<string | null>(null)
  const [faceDetectMessage, setFaceDetectMessage] = useState<string | null>(null)
  const [isDetectingFaces, setIsDetectingFaces] = useState(false)
  const [isAutoRedacting, setIsAutoRedacting] = useState(false)
  const [isSavingRedaction, setIsSavingRedaction] = useState(false)
  const [previewMode, setPreviewMode] = useState<PreviewMode>('original')
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<FaceSuggestion[]>([])
  const [showRedactionOverlay, setShowRedactionOverlay] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadItem = async () => {
      if (!id) {
        setError('Missing item id.')
        setIsLoading(false)
        return
      }

      const record = await db.items.get(id)
      const custody = await db.custody_events.where('itemId').equals(id).sortBy('ts')

      if (mounted) {
        setItem(record ?? null)
        setEvents(custody)
        setIsLoading(false)
        setSuggestions([])
        setFaceDetectMessage(null)
      }
    }

    void loadItem()

    return () => {
      mounted = false
    }
  }, [id])

  useEffect(() => {
    if (!item || item.type !== 'photo') {
      setRects([])
      return
    }
    setRects(item.redaction?.rects ?? [])
  }, [item?.id])

  useEffect(() => {
    setShowRedactionOverlay(true)
  }, [item?.id])

  useEffect(() => {
    if (!item?.aiSuggestions || suggestions.length > 0) return
    const storedBoxes = item.aiSuggestions.boxes ?? []
    if (storedBoxes.length === 0) return
    setSuggestions(
      storedBoxes.map((rect, index) => ({
        id: `stored-${item.aiSuggestions?.detectedAt ?? 0}-${index}`,
        rect,
        score: 0,
        included: true,
      }))
    )
  }, [item?.aiSuggestions?.detectedAt, item?.id, suggestions.length])

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
      setRedactionMessage('Add at least one rectangle to pixelate.')
      return
    }

    try {
      setIsSavingRedaction(true)
      setRedactionMessage(null)

      const redactedBlob = await pixelateImage(previewUrl, rects, {
        mimeType: item.blobMime,
      })
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

      const updatedItem: EvidenceItem = {
        ...item,
        redactedBlob: {
          nonce: encrypted.nonce,
          cipher: encrypted.cipher,
        },
        redactedMime: encrypted.mime,
        redactedSize: encrypted.size,
        redaction: {
          method: 'pixelate' as const,
          rects,
          createdAt: now,
        },
      }

      setItem(updatedItem)
      setPreviewMode('redacted')
      setRedactionMessage('Redacted copy saved.')

      const custodyEvent = await appendCustodyEvent({
        itemId: item.id,
        action: 'redact',
        vaultKey,
        details: {
          method: 'pixelate',
          rectCount: rects.length,
        },
      })

      setEvents((prev) => [...prev, custodyEvent])
    } catch (err) {
      console.error(err)
      setRedactionMessage('Unable to save redacted copy.')
    } finally {
      setIsSavingRedaction(false)
    }
  }

  const handleAutoDetectFaces = async () => {
    if (!item || item.type !== 'photo') return
    if (!vaultKey) {
      setFaceDetectMessage('Unlock the vault before running face detection.')
      return
    }

    try {
      setIsDetectingFaces(true)
      setFaceDetectMessage(null)

      const { rects: detectedRects, scores } = await detectFaceRects()

      if (detectedRects.length === 0) {
        setSuggestions([])
        setFaceDetectMessage('No faces detected.')
        return
      }

      const formatted = scores.map((score) => `${Math.round(score * 100)}%`).join(', ')

      setSuggestions(
        detectedRects.map((rect, index) => ({
          id: `face-${index}`,
          rect,
          score: scores[index] ?? 0,
          included: true,
        }))
      )

      setFaceDetectMessage(
        `Found ${detectedRects.length} face${
          detectedRects.length === 1 ? '' : 's'
        }. Confidences: ${formatted}. Add the boxes to make them editable.`,
      )
    } catch (err) {
      console.error(err)
      setFaceDetectMessage('Unable to run face detection. Check that the model is available.')
    } finally {
      setIsDetectingFaces(false)
    }
  }

  const handleApplyAutoFaceBlur = async () => {
    if (!item || item.type !== 'photo') return
    if (!vaultKey) {
      setRedactionMessage('Unlock the vault before applying auto blur.')
      return
    }
    if (!previewUrl) {
      setRedactionMessage('Preview not available yet.')
      return
    }
    if (isSavingRedaction || isAutoRedacting) return

    try {
      setIsAutoRedacting(true)
      setRedactionMessage(null)
      setFaceDetectMessage(null)

      const { rects: detectedRects } = await detectFaceRects()

      if (detectedRects.length === 0) {
        setFaceDetectMessage('No faces detected.')
        return
      }

      const redactedBlob = await pixelateImage(previewUrl, detectedRects, {
        mimeType: item.blobMime,
      })
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
          rects: detectedRects,
          createdAt: now,
        },
      })

      const updatedItem: EvidenceItem = {
        ...item,
        redactedBlob: {
          nonce: encrypted.nonce,
          cipher: encrypted.cipher,
        },
        redactedMime: encrypted.mime,
        redactedSize: encrypted.size,
        redaction: {
          method: 'pixelate' as const,
          rects: detectedRects,
          createdAt: now,
        },
      }

      setItem(updatedItem)
      setRects(detectedRects)
      setSuggestions([])
      setPreviewMode('redacted')
      setRedactionMessage('Auto blur applied to detected faces.')

      const custodyEvent = await appendCustodyEvent({
        itemId: item.id,
        action: 'redact',
        vaultKey,
        details: {
          method: 'pixelate',
          rectCount: detectedRects.length,
          auto: true,
        },
      })

      setEvents((prev) => [...prev, custodyEvent])
    } catch (err) {
      console.error(err)
      setRedactionMessage('Unable to auto blur faces.')
    } finally {
      setIsAutoRedacting(false)
    }
  }

  const handleCopyHash = async (hash?: string) => {
    if (!hash) return
    try {
      await navigator.clipboard.writeText(hash)
      setCopiedHash(hash)
      window.setTimeout(() => setCopiedHash(null), 1500)
    } catch (err) {
      console.error(err)
    }
  }

  const detectFaceRects = async () => {
    if (!item || item.type !== 'photo') {
      return { rects: [] as RedactionRect[], scores: [] as number[] }
    }
    if (!vaultKey) {
      throw new Error('Vault locked')
    }

    const blob = await decryptBlob(vaultKey, {
      nonce: item.encryptedBlob.nonce,
      cipher: item.encryptedBlob.cipher,
      mime: item.blobMime,
      size: item.blobSize,
    })

    let rects: RedactionRect[] = []
    let scores: number[] = []

    const bitmapForWorker = await createImageBitmap(blob)
    try {
      const workerResult = await detectFacesInWorker(bitmapForWorker, { basePath: '/mediapipe' })
      const bitmapWidth = bitmapForWorker.width
      const bitmapHeight = bitmapForWorker.height
      rects = workerResult.rects
        .map((rect) => {
          const x = Math.max(0, Math.min(bitmapWidth, rect.x))
          const y = Math.max(0, Math.min(bitmapHeight, rect.y))
          const width = Math.max(0, Math.min(bitmapWidth - x, rect.width))
          const height = Math.max(0, Math.min(bitmapHeight - y, rect.height))
          if (width <= 0 || height <= 0) return null
          return { x, y, width, height }
        })
        .filter((rect): rect is RedactionRect => Boolean(rect))
      scores = workerResult.scores
    } catch (workerError) {
      console.warn('Face detection worker failed, falling back to main thread.', workerError)
      bitmapForWorker.close?.()
      const bitmap = await createImageBitmap(blob)
      const result = await detectFaces(bitmap, { basePath: '/mediapipe' })
      const bitmapWidth = bitmap.width
      const bitmapHeight = bitmap.height
      bitmap.close?.()

      result.detections.forEach((detection) => {
        const categoryScores = detection.categories.map((category) => category.score ?? 0)
        const score = categoryScores.length ? Math.max(...categoryScores) : 0
        const box = detection.boundingBox
        if (!box) return
        const x = Math.max(0, Math.min(bitmapWidth, box.originX))
        const y = Math.max(0, Math.min(bitmapHeight, box.originY))
        const width = Math.max(0, Math.min(bitmapWidth - x, box.width))
        const height = Math.max(0, Math.min(bitmapHeight - y, box.height))
        if (width <= 0 || height <= 0) return
        rects.push({ x, y, width, height })
        scores.push(score)
      })
    }

    if (rects.length > 0) {
      const aiSuggestions = {
        modelVersion: FACE_MODEL_VERSION,
        detectedAt: Date.now(),
        boxes: rects,
      }
      await db.items.update(item.id, { aiSuggestions })
      setItem((prev) => (prev ? { ...prev, aiSuggestions } : prev))
    }

    return { rects, scores }
  }

  const handleApplySuggestions = () => {
    const accepted = suggestions.filter((suggestion) => suggestion.included)
    if (accepted.length === 0) {
      setFaceDetectMessage('Select at least one suggested face to add.')
      return
    }
    setRects((prev) => [...prev, ...accepted.map((suggestion) => suggestion.rect)])
    setSuggestions((prev) => prev.filter((suggestion) => !suggestion.included))
    setFaceDetectMessage(
      `Added ${accepted.length} face${accepted.length === 1 ? '' : 's'} as editable rectangles.`,
    )
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
                  {item.type === 'photo' && !showingRedacted && (
                    <button
                      type="button"
                      onClick={() => setShowRedactionOverlay((prev) => !prev)}
                      className={[
                        'rounded-full border px-3 py-1 font-medium transition',
                        showRedactionOverlay
                          ? 'border-amber-300 bg-amber-100/70 text-amber-900 dark:border-amber-500/50 dark:bg-amber-900/30 dark:text-amber-100'
                          : 'border-sand-200 bg-white/60 text-sand-600 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-300',
                      ].join(' ')}
                    >
                      {showRedactionOverlay ? 'Hide boxes' : 'Show boxes'}
                    </button>
                  )}
                </div>

                {item.type === 'photo' && !showingRedacted && showRedactionOverlay && (
                  <RedactionCanvas
                    imageUrl={previewUrl}
                    initialRects={item.redaction?.rects}
                    rects={rects}
                    suggestions={suggestions.map((suggestion) => ({
                      rect: suggestion.rect,
                      included: suggestion.included,
                    }))}
                    onChange={setRects}
                  />
                )}
                {item.type === 'photo' && !showingRedacted && !showRedactionOverlay && (
                  <img
                    src={previewUrl}
                    alt={item.metadata.what || 'Evidence preview'}
                    className="w-full rounded-2xl border border-sand-200 object-cover dark:border-sand-700"
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
                    <Button onClick={saveRedacted} disabled={isSavingRedaction || isAutoRedacting}>
                      {isSavingRedaction ? 'Saving…' : 'Save redacted copy'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleApplyAutoFaceBlur}
                      disabled={isAutoRedacting || isSavingRedaction}
                    >
                      {isAutoRedacting ? 'Applying…' : 'Apply blur to faces'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleAutoDetectFaces}
                      disabled={isDetectingFaces || isAutoRedacting}
                    >
                      {isDetectingFaces ? 'Detecting…' : 'Auto-detect faces'}
                    </Button>
                    <span className="text-xs text-sand-600 dark:text-sand-400">
                      Pixelate manual regions or auto-blur detected faces.
                    </span>
                  </div>
                )}
                {item.type === 'photo' &&
                  !showingRedacted &&
                  showRedactionOverlay &&
                  suggestions.length > 0 && (
                  <div className="space-y-2 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-100">
                    <p className="font-semibold uppercase tracking-[0.2em] text-[0.55rem]">
                      Suggested faces
                    </p>
                    <div className="space-y-2">
                      {suggestions.map((suggestion, index) => (
                        <label
                          key={suggestion.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={suggestion.included}
                            onChange={(event) => {
                              const included = event.target.checked
                              setSuggestions((prev) =>
                                prev.map((entry) =>
                                  entry.id === suggestion.id
                                    ? { ...entry, included }
                                    : entry
                                )
                              )
                            }}
                          />
                          <span>
                            Face {index + 1} · {Math.round(suggestion.score * 100)}%
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button variant="outline" onClick={handleApplySuggestions}>
                        Add selected to redactions
                      </Button>
                      <span className="text-[0.6rem] text-emerald-800/80 dark:text-emerald-100/80">
                        Converts suggestions into editable rectangles.
                      </span>
                    </div>
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
                {faceDetectMessage && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-200">
                    {faceDetectMessage}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-sand-600 dark:text-sand-400">
                Unlock the vault to decrypt this item.
              </p>
            )}
          </Card>

          <div className="space-y-6">
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

            <Card title="Custody timeline" description="Tamper-evident event history">
              {events.length === 0 ? (
                <p className="text-sm text-sand-600 dark:text-sand-400">
                  No custody events recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-sand-200 bg-white/60 p-3 text-xs text-sand-700 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-300"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-sand-900 dark:text-sand-100">
                          {event.action.toUpperCase()}
                        </span>
                        <span className="text-sand-500 dark:text-sand-400">
                          {formatEventTime(event.ts)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-sand-200 px-2 py-0.5 dark:border-sand-700">
                          {truncateHash(event.hash)}
                        </span>
                        <button
                          type="button"
                          className="rounded-full border border-sand-200 px-2 py-0.5 text-xs text-sand-600 transition hover:border-sand-400 dark:border-sand-700 dark:text-sand-300 dark:hover:border-sand-500"
                          onClick={() => handleCopyHash(event.hash)}
                        >
                          {copiedHash === event.hash ? 'Copied' : 'Copy hash'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <Card title="Not found" description="No matching evidence item." />
      )}
    </div>
  )
}
