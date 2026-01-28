import { beforeEach, describe, expect, it } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { createHash } from 'node:crypto'
import { db } from '../db'
import { encryptBlob } from '../crypto/blob'
import { getSodium } from '../crypto/sodium'
import { buildExportZip } from './zip'

const sha256Hex = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

describe('export bundle', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('builds a zip with manifest, custody log, and expected file hashes', async () => {
    const sodium = await getSodium()
    const vaultKey = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES)
    const now = Date.now()

    const originalBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    const redactedBytes = new Uint8Array([9, 10, 11, 12])

    const originalBlob = new Blob([originalBytes], { type: 'image/jpeg' })
    const redactedBlob = new Blob([redactedBytes], { type: 'image/jpeg' })

    const encrypted = await encryptBlob(vaultKey, originalBlob)
    const redactedEncrypted = await encryptBlob(vaultKey, redactedBlob)

    const itemId = 'item-photo-1'

    await db.items.add({
      id: itemId,
      type: 'photo',
      createdAt: now,
      capturedAt: now,
      encryptedBlob: { nonce: encrypted.nonce, cipher: encrypted.cipher },
      blobMime: encrypted.mime,
      blobSize: encrypted.size,
      redactedBlob: { nonce: redactedEncrypted.nonce, cipher: redactedEncrypted.cipher },
      redactedMime: redactedEncrypted.mime,
      redactedSize: redactedEncrypted.size,
      metadata: { what: 'Test photo', where: 'Field', notes: 'Fixture' },
      location: { lat: 37.77, lon: -122.41, accuracy: 12, ts: now },
      redaction: {
        method: 'pixelate',
        rects: [{ x: 1, y: 1, width: 2, height: 2 }],
        createdAt: now,
      },
    })

    await db.vault_meta.put({
      id: 'primary',
      createdAt: now,
      updatedAt: now,
      signingPublicKey: 'fixture-public-key',
    })

    await db.custody_events.add({
      id: 'custody-1',
      itemId,
      ts: now,
      action: 'capture',
      details: { note: 'captured' },
      prevHash: null,
      hash: 'hash-1',
      signature: 'sig-1',
    })

    await db.custody_events.add({
      id: 'custody-2',
      itemId,
      ts: now + 1,
      action: 'redact',
      details: { note: 'redacted' },
      prevHash: 'hash-1',
      hash: 'hash-2',
      signature: 'sig-2',
    })

    const exportId = 'export-fixture'
    const item = await db.items.get(itemId)
    if (!item) {
      throw new Error('Fixture item missing')
    }

    const result = await buildExportZip({
      exportId,
      items: [item],
      includeOriginals: true,
      includeRedacted: true,
      includeMetadata: true,
      outputMode: 'review',
      vaultKey,
    })

    const zip = unzipSync(result.zipData)
    const baseDir = result.zipFilename.replace('.zip', '')

    const expectedPaths = [
      `${baseDir}/README.txt`,
      `${baseDir}/manifest.json`,
      `${baseDir}/manifest.csv`,
      `${baseDir}/custody_log.jsonl`,
      `${baseDir}/media/item_${itemId}_original.jpg`,
      `${baseDir}/media/item_${itemId}_redacted.jpg`,
      `${baseDir}/verify/verify.html`,
      `${baseDir}/verify/verify.js`,
    ]

    expectedPaths.forEach((path) => {
      expect(zip[path]).toBeDefined()
    })

    const manifestText = strFromU8(zip[`${baseDir}/manifest.json`])
    const manifest = JSON.parse(manifestText)
    const originalEntry = manifest.files.find(
      (entry: any) => entry.filename === `media/item_${itemId}_original.jpg`
    )
    const redactedEntry = manifest.files.find(
      (entry: any) => entry.filename === `media/item_${itemId}_redacted.jpg`
    )

    expect(originalEntry).toBeDefined()
    expect(redactedEntry).toBeDefined()

    const originalZipBytes = zip[`${baseDir}/media/item_${itemId}_original.jpg`]
    const redactedZipBytes = zip[`${baseDir}/media/item_${itemId}_redacted.jpg`]

    expect(sha256Hex(originalZipBytes)).toBe(originalEntry.sha256)
    expect(sha256Hex(redactedZipBytes)).toBe(redactedEntry.sha256)

    const custodyText = strFromU8(zip[`${baseDir}/custody_log.jsonl`])
    const custodyLines = custodyText.split(/\r?\n/).filter(Boolean)
    expect(custodyLines).toHaveLength(2)

    custodyLines.forEach((line) => {
      const entry = JSON.parse(line)
      expect(entry.exportHashSha256).toBeTruthy()
      expect(entry.canonical).toBeTruthy()
    })
  })
})
