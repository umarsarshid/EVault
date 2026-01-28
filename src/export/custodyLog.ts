import { getSodium } from '../crypto/sodium'
import { canonicalizeCustodyEventContent } from '../custody'
import { db } from '../db'

export type CustodyLogEntry = {
  id: string
  itemId: string
  ts: number
  action: string
  details: Record<string, unknown> | null
  prevHash: string | null
  hash: string | null
  signature: string | null
  publicKey: string | null
  canonical: string
  exportPrevHashSha256: string | null
  exportHashSha256: string | null
}

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

const hashSha256Hex = async (input: string) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data)
    return toHex(new Uint8Array(digest))
  }

  const sodium = await getSodium()
  const hash = sodium.crypto_hash_sha256(data)
  return sodium.to_hex(hash)
}

export const buildCustodyLog = async (itemIds: string[]) => {
  const uniqueIds = Array.from(new Set(itemIds))
  const vaultMeta = await db.vault_meta.get('primary')
  const publicKey = vaultMeta?.signingPublicKey ?? null
  const lines: string[] = []

  for (const itemId of uniqueIds) {
    const events = await db.custody_events.where('itemId').equals(itemId).sortBy('ts')
    let prevExportHash: string | null = null

    for (const event of events) {
      const canonical = canonicalizeCustodyEventContent(event)
      const exportHashSha256 = await hashSha256Hex(`${prevExportHash ?? ''}${canonical}`)

      const entry: CustodyLogEntry = {
        id: event.id,
        itemId: event.itemId,
        ts: event.ts,
        action: event.action,
        details: event.details ?? null,
        prevHash: event.prevHash ?? null,
        hash: event.hash ?? null,
        signature: event.signature ?? null,
        publicKey,
        canonical,
        exportPrevHashSha256: prevExportHash,
        exportHashSha256,
      }

      lines.push(JSON.stringify(entry))
      prevExportHash = exportHashSha256
    }
  }

  return lines.join('\n')
}
