import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { decryptBlob, encryptBlob } from './blob'
import { createVault, unlockVault } from './vault'
import { getSodium } from './sodium'

describe('crypto helpers', () => {
  beforeEach(async () => {
    await db.delete()
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
})
