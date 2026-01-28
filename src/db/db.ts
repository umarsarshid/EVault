import Dexie, { type Table } from 'dexie'
import type { CustodyEvent, EvidenceItem, Setting, VaultMeta } from './types'

export class EvidenceVaultDB extends Dexie {
  vault_meta!: Table<VaultMeta, 'primary'>
  items!: Table<EvidenceItem, string>
  custody_events!: Table<CustodyEvent, string>
  settings!: Table<Setting, string>

  constructor(name = 'evidence_vault') {
    super(name)

    this.version(1).stores({
      vault_meta: 'id, createdAt, updatedAt',
      items: 'id, createdAt, type, status',
      custody_events: 'id, itemId, timestamp, type',
      settings: '&key, updatedAt',
    })

    this.version(2)
      .stores({
        vault_meta: 'id, createdAt, updatedAt',
        items: 'id, createdAt, capturedAt, type',
        custody_events: 'id, itemId, timestamp, type',
        settings: '&key, updatedAt',
      })
      .upgrade((tx) =>
        tx
          .table('items')
          .toCollection()
          .modify((item) => {
            if (!item.capturedAt) {
              item.capturedAt = item.createdAt
            }
          })
      )

    this.version(3)
      .stores({
        vault_meta: 'id, createdAt, updatedAt',
        items: 'id, createdAt, capturedAt, type',
        custody_events: 'id, itemId, ts, action',
        settings: '&key, updatedAt',
      })
      .upgrade((tx) =>
        tx
          .table('custody_events')
          .toCollection()
          .modify((event) => {
            if (event.timestamp && !event.ts) {
              event.ts = event.timestamp
            }
            if (event.type && !event.action) {
              event.action = event.type
            }
            if (!event.details && event.note) {
              event.details = { note: event.note }
            }
            delete event.timestamp
            delete event.type
            delete event.note
          })
      )
  }
}

const primaryDb = new EvidenceVaultDB('evidence_vault')
const demoDb = new EvidenceVaultDB('evidence_vault_demo')

export type VaultDbMode = 'real' | 'demo'

export let db = primaryDb

export const setActiveDb = (mode: VaultDbMode) => {
  const next = mode === 'demo' ? demoDb : primaryDb
  if (db !== next) {
    db.close()
    db = next
  }
}

export const getActiveDbMode = (): VaultDbMode => (db === demoDb ? 'demo' : 'real')
