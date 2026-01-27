import { db, type CustodyEvent } from '../db'

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
}

const formatEntry = (event: CustodyEvent, publicKey: string | null): CustodyLogEntry => ({
  id: event.id,
  itemId: event.itemId,
  ts: event.ts,
  action: event.action,
  details: event.details ?? null,
  prevHash: event.prevHash ?? null,
  hash: event.hash ?? null,
  signature: event.signature ?? null,
  publicKey,
})

export const buildCustodyLog = async (itemIds: string[]) => {
  const uniqueIds = Array.from(new Set(itemIds))
  const vaultMeta = await db.vault_meta.get('primary')
  const publicKey = vaultMeta?.signingPublicKey ?? null
  const lines: string[] = []

  for (const itemId of uniqueIds) {
    const events = await db.custody_events.where('itemId').equals(itemId).sortBy('ts')
    for (const event of events) {
      lines.push(JSON.stringify(formatEntry(event, publicKey)))
    }
  }

  return lines.join('\n')
}
