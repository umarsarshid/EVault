import { db, type CustodyEvent, type CustodyEventAction } from '../db'
import { getSodium } from '../crypto/sodium'
import { signHash } from '../crypto/signing'
import { canonicalizeCustodyEventContent } from './schema'

export type AppendCustodyEventInput = {
  itemId: string
  action: CustodyEventAction
  details?: Record<string, unknown>
  vaultKey: Uint8Array
}

const createEventId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `custody_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const hashCustodyPayload = async (prevHash: string | undefined, payload: string) => {
  const sodium = await getSodium()
  const input = `${prevHash ?? ''}${payload}`
  const hashBytes = sodium.crypto_generichash(32, sodium.from_string(input))
  return sodium.to_base64(hashBytes, sodium.base64_variants.ORIGINAL)
}

export const appendCustodyEvent = async ({
  itemId,
  action,
  details,
  vaultKey,
}: AppendCustodyEventInput): Promise<CustodyEvent> => {
  const existing = await db.custody_events.where('itemId').equals(itemId).sortBy('ts')
  const prevHash = existing.length ? existing[existing.length - 1].hash : undefined

  const event: CustodyEvent = {
    id: createEventId(),
    itemId,
    ts: Date.now(),
    action,
    details,
    prevHash,
  }

  const payload = canonicalizeCustodyEventContent(event)
  event.hash = await hashCustodyPayload(prevHash, payload)

  const { signature, publicKey } = await signHash(vaultKey, event.hash)
  event.signature = signature

  await db.vault_meta.update('primary', { signingPublicKey: publicKey })

  await db.custody_events.add(event)

  return event
}
