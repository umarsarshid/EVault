export type VaultMeta = {
  id: 'primary'
  createdAt: number
  updatedAt: number
  vaultName?: string
  status?: 'locked' | 'unlocked'
}

export type EvidenceItem = {
  id: string
  type: 'photo' | 'video' | 'audio' | 'testimony'
  createdAt: number
  updatedAt: number
  title?: string
  status?: 'draft' | 'final'
}

export type CustodyEvent = {
  id: string
  itemId: string
  type: 'capture' | 'redact' | 'export' | 'verify'
  timestamp: number
  note?: string
}

export type Setting = {
  key: string
  value: string
  updatedAt: number
}
