import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import { decryptBlob, encryptBlob } from './blob'
import { createVault, unlockVault } from './vault'
import { appendCustodyEvent, canonicalStringify, verifyCustodyChain } from '../custody'
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

  it('canonical stringifies objects with stable key order', () => {
    const first = canonicalStringify({ b: 2, a: { z: 1, y: 2 }, c: [3, 2, 1] })
    const second = canonicalStringify({ c: [3, 2, 1], a: { y: 2, z: 1 }, b: 2 })

    expect(first).toBe(second)
  })

  it('detects tampering in custody hash chain', async () => {
    const { vaultKey } = await createVault({ vaultName: 'Test Vault', passphrase: 'chain-key' })
    const itemId = 'item-123'

    const first = await appendCustodyEvent({
      itemId,
      action: 'capture',
      vaultKey,
      details: { note: 'initial' },
    })

    const second = await appendCustodyEvent({
      itemId,
      action: 'redact',
      vaultKey,
      details: { note: 'mask' },
    })

    const events = [first, second]
    expect(await verifyCustodyChain(events)).toBe(true)

    const tampered = { ...second, details: { note: 'changed' } }
    expect(await verifyCustodyChain([first, tampered])).toBe(false)
  })
})
