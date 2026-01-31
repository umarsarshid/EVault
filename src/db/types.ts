export type VaultMeta = {
  id: 'primary'
  createdAt: number
  updatedAt: number
  vaultName?: string
  status?: 'locked' | 'unlocked'
  salt?: string
  kdfParams?: VaultKdfParams
  wrappedVaultKey?: WrappedVaultKey
  signingPublicKey?: string
  wrappedSigningKey?: WrappedVaultKey
}

export type VaultKdfParams = {
  alg: 'argon2id'
  opslimit: number
  memlimit: number
  saltBytes: number
  keyBytes: number
}

export type WrappedVaultKey = {
  nonce: string
  cipher: string
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
  ts?: number
}

export type ItemRedactionRect = {
  x: number
  y: number
  width: number
  height: number
}

export type ItemRedaction = {
  method: 'pixelate'
  rects: ItemRedactionRect[]
  createdAt: number
}

export type ItemAiSuggestions = {
  modelVersion: string
  detectedAt: number
  boxes: ItemRedactionRect[]
}

export type EncryptedPayload = {
  nonce: string
  cipher: string
}

export type EvidenceItem = {
  id: string
  type: 'photo' | 'video' | 'audio' | 'testimony'
  createdAt: number
  capturedAt: number
  encryptedBlob: EncryptedPayload
  blobMime: string
  blobSize: number
  redactedBlob?: EncryptedPayload
  redactedMime?: string
  redactedSize?: number
  metadata: ItemMetadata
  location?: ItemLocation
  redaction?: ItemRedaction
  aiSuggestions?: ItemAiSuggestions
  updatedAt?: number
}

export type CustodyEventAction = 'capture' | 'redact' | 'export' | 'verify' | 'delete'

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
