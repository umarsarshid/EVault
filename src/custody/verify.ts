import type { CustodyEvent } from '../db'
import { canonicalizeCustodyEventContent } from './schema'
import { getSodium } from '../crypto/sodium'

const hashCustodyPayload = async (prevHash: string | undefined, payload: string) => {
  const sodium = await getSodium()
  const input = `${prevHash ?? ''}${payload}`
  const hashBytes = sodium.crypto_generichash(32, sodium.from_string(input), null)
  return sodium.to_base64(hashBytes, sodium.base64_variants.ORIGINAL)
}

export const verifyCustodyChain = async (events: CustodyEvent[]) => {
  if (events.length === 0) return true

  const sorted = [...events].sort((a, b) => a.ts - b.ts)
  let prevHash: string | undefined

  for (const event of sorted) {
    const payload = canonicalizeCustodyEventContent(event)
    const expectedHash = await hashCustodyPayload(prevHash, payload)
    if (event.prevHash !== prevHash || event.hash !== expectedHash) {
      return false
    }
    prevHash = event.hash
  }

  return true
}
