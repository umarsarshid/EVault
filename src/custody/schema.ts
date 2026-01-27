import type { CustodyEvent } from '../db'
import { canonicalStringify } from './canonical'

export const custodyEventFields = [
  'id',
  'itemId',
  'ts',
  'action',
  'details',
  'prevHash',
  'hash',
  'signature',
] as const

export const custodyEventPayload = (event: CustodyEvent) => ({
  id: event.id,
  itemId: event.itemId,
  ts: event.ts,
  action: event.action,
  details: event.details ?? null,
  prevHash: event.prevHash ?? null,
  hash: event.hash ?? null,
  signature: event.signature ?? null,
})

export const canonicalizeCustodyEvent = (event: CustodyEvent) =>
  canonicalStringify(custodyEventPayload(event))

export const custodyEventContent = (event: CustodyEvent) => ({
  id: event.id,
  itemId: event.itemId,
  ts: event.ts,
  action: event.action,
  details: event.details ?? null,
})

export const canonicalizeCustodyEventContent = (event: CustodyEvent) =>
  canonicalStringify(custodyEventContent(event))
