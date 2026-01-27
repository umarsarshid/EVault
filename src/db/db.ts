import Dexie, { type Table } from 'dexie'
import type { CustodyEvent, EvidenceItem, Setting, VaultMeta } from './types'

export class EvidenceVaultDB extends Dexie {
  vault_meta!: Table<VaultMeta, 'primary'>
  items!: Table<EvidenceItem, string>
  custody_events!: Table<CustodyEvent, string>
  settings!: Table<Setting, string>

  constructor() {
    super('evidence_vault')

    this.version(1).stores({
      vault_meta: 'id, createdAt, updatedAt',
      items: 'id, createdAt, type, status',
      custody_events: 'id, itemId, timestamp, type',
      settings: '&key, updatedAt',
    })
  }
}

export const db = new EvidenceVaultDB()
