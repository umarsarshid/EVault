import { strToU8, zipSync } from 'fflate'
import { decryptBlob } from '../crypto/blob'
import { canonicalStringify } from '../custody'
import type { EvidenceItem } from '../db'
import { buildCustodyLog } from './custodyLog'
import {
  buildExportFilename,
  buildExportManifest,
  type ExportManifest,
  type ExportOutputMode,
} from './manifest'
import { verifyHtml, verifyJs } from './verifyTemplates'

export type BuildExportZipInput = {
  exportId: string
  items: EvidenceItem[]
  includeOriginals: boolean
  includeRedacted: boolean
  includeMetadata: boolean
  outputMode: ExportOutputMode
  vaultKey?: Uint8Array
}

export type BuildExportZipResult = {
  zipData: Uint8Array
  zipFilename: string
  manifest: ExportManifest
  manifestJson: string
  manifestCsv: string
  custodyLog: string
}

const pad2 = (value: number) => String(value).padStart(2, '0')

const formatDateStamp = (date = new Date()) => {
  const year = date.getFullYear()
  const month = pad2(date.getMonth() + 1)
  const day = pad2(date.getDate())
  return `${year}${month}${day}`
}

const buildReadme = (manifest: ExportManifest) => `Evidence Vault export bundle

Export ID: ${manifest.exportId}
Generated: ${manifest.createdAt}
Output mode: ${manifest.outputMode}

Contents
- manifest.json / manifest.csv: file listing with SHA-256 hashes and metadata.
- custody_log.jsonl: chain-of-custody events (one JSON object per line).
- media/: original and/or redacted evidence files.
- verify/: offline verifier (open verify.html in a browser).

Notes
- Keep originals secure. Redacted copies are irreversible in exports unless originals are included.
- Follow local laws for consent and handling sensitive data.
`

const buildEncryptedPayload = (payload: {
  nonce: string
  cipher: string
  mime: string
  size: number
}) => {
  const canonical = canonicalStringify(payload)
  return strToU8(canonical)
}

const addFile = (files: Record<string, Uint8Array>, path: string, data: Uint8Array | string) => {
  files[path] = typeof data === 'string' ? strToU8(data) : data
}

const buildMediaFile = async ({
  item,
  variant,
  outputMode,
  vaultKey,
}: {
  item: EvidenceItem
  variant: 'original' | 'redacted'
  outputMode: ExportOutputMode
  vaultKey?: Uint8Array
}) => {
  const encrypted = variant === 'redacted' ? item.redactedBlob : item.encryptedBlob
  if (!encrypted) return null

  const mime = variant === 'redacted' ? item.redactedMime ?? item.blobMime : item.blobMime
  const size = variant === 'redacted' ? item.redactedSize ?? item.blobSize : item.blobSize
  const filename = buildExportFilename(item, variant, outputMode, mime)

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
    return { filename, data: bytes }
  }

  return {
    filename,
    data: buildEncryptedPayload({
      nonce: encrypted.nonce,
      cipher: encrypted.cipher,
      mime,
      size,
    }),
  }
}

export const buildExportZip = async ({
  exportId,
  items,
  includeOriginals,
  includeRedacted,
  includeMetadata,
  outputMode,
  vaultKey,
}: BuildExportZipInput): Promise<BuildExportZipResult> => {
  const { manifest, json, csv } = await buildExportManifest({
    exportId,
    items,
    includeOriginals,
    includeRedacted,
    includeMetadata,
    outputMode,
    vaultKey,
  })

  const custodyLog = await buildCustodyLog(items.map((item) => item.id))
  const dateStamp = formatDateStamp()
  const baseDir = `EvidenceVault_Export_${dateStamp}`

  const files: Record<string, Uint8Array> = {}
  addFile(files, `${baseDir}/README.txt`, buildReadme(manifest))
  addFile(files, `${baseDir}/manifest.json`, json)
  addFile(files, `${baseDir}/manifest.csv`, csv)
  addFile(files, `${baseDir}/custody_log.jsonl`, custodyLog)
  addFile(files, `${baseDir}/verify/verify.html`, verifyHtml)
  addFile(files, `${baseDir}/verify/verify.js`, verifyJs)

  for (const item of items) {
    if (includeOriginals) {
      const original = await buildMediaFile({
        item,
        variant: 'original',
        outputMode,
        vaultKey,
      })
      if (original) {
        addFile(files, `${baseDir}/${original.filename}`, original.data)
      }
    }

    if (includeRedacted) {
      const redacted = await buildMediaFile({
        item,
        variant: 'redacted',
        outputMode,
        vaultKey,
      })
      if (redacted) {
        addFile(files, `${baseDir}/${redacted.filename}`, redacted.data)
      }
    }
  }

  const zipData = zipSync(files)
  return {
    zipData,
    zipFilename: `${baseDir}.zip`,
    manifest,
    manifestJson: json,
    manifestCsv: csv,
    custodyLog,
  }
}
