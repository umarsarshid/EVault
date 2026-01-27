import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { decryptBlob, encryptBlob } from './blob'
import { createVault, unlockVault } from './vault'
import { getSodium } from './sodium'

describe('crypto helpers', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('roundtrips encrypted blobs', async () => {
    const sodium = await getSodium()
    const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES)
    const original = new Blob(['hello vault'], { type: 'text/plain' })

    const encrypted = await encryptBlob(key, original)
    const decrypted = await decryptBlob(key, encrypted)
    const text = await decrypted.text()

    expect(text).toBe('hello vault')
    expect(decrypted.type).toBe('text/plain')
  })

  it('rejects unlock with wrong passphrase', async () => {
    await createVault({ vaultName: 'Test Vault', passphrase: 'correct-horse' })

    await expect(unlockVault('wrong-passphrase')).rejects.toThrow('Invalid passphrase')
  })

  it('saves encrypted testimony payload as JSON', async () => {
    const { vaultKey } = await createVault({ vaultName: 'Test Vault', passphrase: 'paper-key' })
    const payload = {
      what: 'Observed incident',
      when: '2026-01-27T10:30',
      where: 'Main Street',
      notes: 'Text-only capture',
    }

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    const encrypted = await encryptBlob(vaultKey, blob)
    const decrypted = await decryptBlob(vaultKey, encrypted)
    const text = await decrypted.text()

    expect(text).toContain(payload.what)
    expect(JSON.parse(text)).toMatchObject(payload)
  })
})
