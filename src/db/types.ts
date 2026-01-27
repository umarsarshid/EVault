export type VaultMeta = {
  id: 'primary'
  createdAt: number
  updatedAt: number
  vaultName?: string
  status?: 'locked' | 'unlocked'
}

export type ItemMetadata = {
  what?: string
  where?: string
  notes?: string
}

export type ItemLocation = {
  lat: number
  lon: number
  accuracy?: number
}

export type ItemRedaction = Record<string, unknown>

export type EvidenceItem = {
  id: string
  type: 'photo' | 'video' | 'audio' | 'testimony'
  createdAt: number
  capturedAt: number
  encryptedBlob: Uint8Array
  blobMime: string
  blobSize: number
  metadata: ItemMetadata
  location?: ItemLocation
  redaction?: ItemRedaction
  updatedAt?: number
}

export type CustodyEventAction = 'capture' | 'redact' | 'export' | 'verify'

export type CustodyEvent = {
  id: string
  itemId: string
  ts: number
  action: CustodyEventAction
  details?: Record<string, unknown>
  prevHash?: string
  hash?: string
  signature?: string
}

export type Setting = {
  key: string
  value: string
  updatedAt: number
}
