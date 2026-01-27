import { decryptBlob } from '../crypto/blob'
import { getSodium } from '../crypto/sodium'
import { canonicalStringify } from '../custody'
import type { EvidenceItem, ItemLocation } from '../db'

export type ExportOutputMode = 'review' | 'encrypted'

export type ManifestLocation = {
  lat: number
  lon: number
  accuracy?: number
  ts?: string
}

export type ManifestFileEntry = {
  filename: string
  sha256: string
  capturedAt: string
  what?: string
  where?: string
  notes?: string
  location?: ManifestLocation
  custodyLog: string
}

export type ExportManifest = {
  exportId: string
  createdAt: string
  outputMode: ExportOutputMode
  includeOriginals: boolean
  includeRedacted: boolean
  includeMetadata: boolean
  files: ManifestFileEntry[]
}

export type BuildManifestInput = {
  exportId: string
  items: EvidenceItem[]
  includeOriginals: boolean
  includeRedacted: boolean
  includeMetadata: boolean
  outputMode: ExportOutputMode
  vaultKey?: Uint8Array
}

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'application/json': 'json',
}

const extensionFromMime = (mime: string) => MIME_EXTENSION[mime] ?? 'bin'

const buildFilename = (
  item: EvidenceItem,
  variant: 'original' | 'redacted',
  outputMode: ExportOutputMode,
  mime: string
) => {
  const base = `item-${item.id}-${variant}`
  if (outputMode === 'encrypted') {
    return `${base}.enc.json`
  }
  return `${base}.${extensionFromMime(mime)}`
}

const hashBytesSha256 = async (bytes: Uint8Array) => {
  const sodium = await getSodium()
  const hash = sodium.crypto_hash_sha256(bytes)
  return sodium.to_hex(hash)
}

const hashEncryptedPayload = async (payload: {
  nonce: string
  cipher: string
  mime: string
  size: number
}) => {
  const serialized = canonicalStringify(payload)
  const encoder = new TextEncoder()
  return hashBytesSha256(encoder.encode(serialized))
}

const normalizeLocation = (location?: ItemLocation) => {
  if (!location) return undefined
  return {
    lat: location.lat,
    lon: location.lon,
    accuracy: location.accuracy,
    ts: location.ts ? new Date(location.ts).toISOString() : undefined,
  }
}

const custodyPointerForItem = (itemId: string) => `custody/${itemId}.json`

const formatCapturedAt = (timestamp: number) => new Date(timestamp).toISOString()

const buildManifestEntry = async ({
  item,
  variant,
  outputMode,
  includeMetadata,
  vaultKey,
}: {
  item: EvidenceItem
  variant: 'original' | 'redacted'
  outputMode: ExportOutputMode
  includeMetadata: boolean
  vaultKey?: Uint8Array
}): Promise<ManifestFileEntry | null> => {
  const isRedacted = variant === 'redacted'
  const encrypted = isRedacted ? item.redactedBlob : item.encryptedBlob
  const mime = isRedacted ? item.redactedMime ?? item.blobMime : item.blobMime
  const size = isRedacted ? item.redactedSize ?? item.blobSize : item.blobSize

  if (!encrypted) {
    return null
  }

  let sha256: string

  if (outputMode === 'review') {
    if (!vaultKey) {
      throw new Error('Missing vault key for review-mode export.')
    }
    const blob = await decryptBlob(vaultKey, {
      nonce: encrypted.nonce,
      cipher: encrypted.cipher,
      mime,
      size,
    })
    const bytes = new Uint8Array(await blob.arrayBuffer())
    sha256 = await hashBytesSha256(bytes)
  } else {
    sha256 = await hashEncryptedPayload({
      nonce: encrypted.nonce,
      cipher: encrypted.cipher,
      mime,
      size,
    })
  }

  const metadata = includeMetadata ? item.metadata : undefined
  const location = includeMetadata ? normalizeLocation(item.location) : undefined

  return {
    filename: buildFilename(item, variant, outputMode, mime),
    sha256,
    capturedAt: formatCapturedAt(item.capturedAt),
    what: metadata?.what,
    where: metadata?.where,
    notes: metadata?.notes,
    location,
    custodyLog: custodyPointerForItem(item.id),
  }
}

const escapeCsv = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export const manifestToCsv = (files: ManifestFileEntry[]) => {
  const header = [
    'filename',
    'sha256',
    'capturedAt',
    'what',
    'where',
    'notes',
    'location_lat',
    'location_lon',
    'location_accuracy',
    'location_ts',
    'custody_log',
  ]

  const rows = files.map((file) => [
    escapeCsv(file.filename),
    escapeCsv(file.sha256),
    escapeCsv(file.capturedAt),
    escapeCsv(file.what),
    escapeCsv(file.where),
    escapeCsv(file.notes),
    escapeCsv(file.location?.lat),
    escapeCsv(file.location?.lon),
    escapeCsv(file.location?.accuracy),
    escapeCsv(file.location?.ts),
    escapeCsv(file.custodyLog),
  ])

  return [header.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

export const buildExportManifest = async ({
  exportId,
  items,
  includeOriginals,
  includeRedacted,
  includeMetadata,
  outputMode,
  vaultKey,
}: BuildManifestInput) => {
  const files: ManifestFileEntry[] = []

  for (const item of items) {
    if (includeOriginals) {
      const entry = await buildManifestEntry({
        item,
        variant: 'original',
        outputMode,
        includeMetadata,
        vaultKey,
      })
      if (entry) {
        files.push(entry)
      }
    }

    if (includeRedacted) {
      const entry = await buildManifestEntry({
        item,
        variant: 'redacted',
        outputMode,
        includeMetadata,
        vaultKey,
      })
      if (entry) {
        files.push(entry)
      }
    }
  }

  const manifest: ExportManifest = {
    exportId,
    createdAt: new Date().toISOString(),
    outputMode,
    includeOriginals,
    includeRedacted,
    includeMetadata,
    files,
  }

  return {
    manifest,
    json: JSON.stringify(manifest, null, 2),
    csv: manifestToCsv(files),
  }
}
