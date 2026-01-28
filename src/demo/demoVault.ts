import { encryptBlob } from '../crypto/blob'
import { createVault, unlockVault } from '../crypto/vault'
import { appendCustodyEvent } from '../custody'
import { db } from '../db'

const DEMO_PASSPHRASE = 'demo-vault-passphrase'

const DEMO_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAJ0lEQVR4nGP8z8Dwn4EIwESMolGF'
  + 'R9GkYwYqRZoGAgA2TgL5Zg7VvwAAAABJRU5ErkJggg=='

const base64ToBytes = (input: string) => {
  const binary = atob(input)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const createDemoImageBlob = () =>
  new Blob([base64ToBytes(DEMO_PNG_BASE64)], { type: 'image/png' })

const createDemoTestimonyBlob = (payload: Record<string, unknown>) =>
  new Blob([JSON.stringify(payload)], { type: 'application/json' })

export const ensureDemoVault = async () => {
  const existing = await db.vault_meta.get('primary')
  if (existing) return

  await createVault({ vaultName: 'Demo Vault', passphrase: DEMO_PASSPHRASE })
}

export const seedDemoData = async (vaultKey: Uint8Array) => {
  const count = await db.items.count()
  if (count > 0) return

  const now = Date.now()
  const demoPhotoId = `demo-photo-${now}`
  const demoTestimonyId = `demo-testimony-${now + 1}`

  const photoBlob = createDemoImageBlob()
  const redactedBlob = createDemoImageBlob()

  const encryptedPhoto = await encryptBlob(vaultKey, photoBlob)
  const encryptedRedacted = await encryptBlob(vaultKey, redactedBlob)

  await db.items.add({
    id: demoPhotoId,
    type: 'photo',
    createdAt: now,
    capturedAt: now - 1000 * 60 * 5,
    encryptedBlob: { nonce: encryptedPhoto.nonce, cipher: encryptedPhoto.cipher },
    blobMime: encryptedPhoto.mime,
    blobSize: encryptedPhoto.size,
    redactedBlob: { nonce: encryptedRedacted.nonce, cipher: encryptedRedacted.cipher },
    redactedMime: encryptedRedacted.mime,
    redactedSize: encryptedRedacted.size,
    metadata: {
      what: 'Demo photo capture',
      where: 'Field checkpoint',
      notes: 'Synthetic evidence for portfolio demo',
    },
    location: {
      lat: 37.7749,
      lon: -122.4194,
      accuracy: 42,
      ts: now - 1000 * 60 * 5,
    },
    redaction: {
      method: 'pixelate',
      rects: [{ x: 12, y: 18, width: 90, height: 54 }],
      createdAt: now - 1000 * 60 * 2,
    },
  })

  await appendCustodyEvent({
    itemId: demoPhotoId,
    action: 'capture',
    vaultKey,
    details: { source: 'demo', note: 'photo captured' },
  })

  await appendCustodyEvent({
    itemId: demoPhotoId,
    action: 'redact',
    vaultKey,
    details: { source: 'demo', note: 'redaction applied' },
  })

  const testimonyPayload = {
    what: 'Demo written testimony',
    when: new Date(now - 1000 * 60 * 30).toISOString(),
    where: 'Downtown plaza',
    notes: 'This is synthetic demo data for walkthroughs.',
  }

  const testimonyBlob = createDemoTestimonyBlob(testimonyPayload)
  const encryptedTestimony = await encryptBlob(vaultKey, testimonyBlob)

  await db.items.add({
    id: demoTestimonyId,
    type: 'testimony',
    createdAt: now + 1000,
    capturedAt: now - 1000 * 60 * 30,
    encryptedBlob: { nonce: encryptedTestimony.nonce, cipher: encryptedTestimony.cipher },
    blobMime: encryptedTestimony.mime,
    blobSize: encryptedTestimony.size,
    metadata: {
      what: testimonyPayload.what,
      where: testimonyPayload.where,
      notes: testimonyPayload.notes,
    },
  })

  await appendCustodyEvent({
    itemId: demoTestimonyId,
    action: 'capture',
    vaultKey,
    details: { source: 'demo', note: 'testimony saved' },
  })
}

export const loadDemoVault = async () => {
  await ensureDemoVault()
  const { vaultKey } = await unlockVault(DEMO_PASSPHRASE)
  await seedDemoData(vaultKey)
  return vaultKey
}
