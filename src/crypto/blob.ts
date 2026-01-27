import { getSodium } from './sodium'

export type EncryptedBlob = {
  nonce: string
  cipher: string
  mime: string
  size: number
}

const MAX_VIDEO_BYTES = 250 * 1024 * 1024

export async function encryptBlob(vaultKey: Uint8Array, blob: Blob): Promise<EncryptedBlob> {
  const sodium = await getSodium()

  if (blob.type.startsWith('video/') && blob.size > MAX_VIDEO_BYTES) {
    console.warn(
      `[crypto] Video blob is large (${Math.round(blob.size / (1024 * 1024))}MB). ` +
        'Consider trimming or splitting before encrypting.'
    )
  }

  const plaintext = new Uint8Array(await blob.arrayBuffer())
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const cipher = sodium.crypto_secretbox_easy(plaintext, nonce, vaultKey)

  plaintext.fill(0)

  return {
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
    cipher: sodium.to_base64(cipher, sodium.base64_variants.ORIGINAL),
    mime: blob.type || 'application/octet-stream',
    size: blob.size,
  }
}

export async function decryptBlob(vaultKey: Uint8Array, encrypted: EncryptedBlob): Promise<Blob> {
  const sodium = await getSodium()

  const nonce = sodium.from_base64(encrypted.nonce, sodium.base64_variants.ORIGINAL)
  const cipher = sodium.from_base64(encrypted.cipher, sodium.base64_variants.ORIGINAL)
  const plaintext = sodium.crypto_secretbox_open_easy(cipher, nonce, vaultKey)

  if (!plaintext) {
    throw new Error('Failed to decrypt blob')
  }

  return new Blob([plaintext], { type: encrypted.mime || 'application/octet-stream' })
}
