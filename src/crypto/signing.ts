import { db } from '../db'
import { getSodium } from './sodium'

type SigningKeys = {
  publicKey: Uint8Array
  privateKey: Uint8Array
}

const decodeBase64 = (value: string, sodium: any) =>
  sodium.from_base64(value, sodium.base64_variants.ORIGINAL)

export const loadSigningKeys = async (vaultKey: Uint8Array): Promise<SigningKeys> => {
  const sodium = await getSodium()
  const vaultMeta = await db.vault_meta.get('primary')

  if (!vaultMeta?.wrappedSigningKey) {
    throw new Error('Signing key wrapper missing')
  }

  const nonce = decodeBase64(vaultMeta.wrappedSigningKey.nonce, sodium)
  const cipher = decodeBase64(vaultMeta.wrappedSigningKey.cipher, sodium)
  const privateKey = sodium.crypto_secretbox_open_easy(cipher, nonce, vaultKey)

  if (!privateKey) {
    throw new Error('Unable to decrypt signing key')
  }

  let publicKey: Uint8Array
  if (vaultMeta.signingPublicKey) {
    publicKey = decodeBase64(vaultMeta.signingPublicKey, sodium)
  } else {
    publicKey = sodium.crypto_sign_ed25519_sk_to_pk(privateKey)
    await db.vault_meta.update('primary', {
      signingPublicKey: sodium.to_base64(publicKey, sodium.base64_variants.ORIGINAL),
    })
  }

  return { publicKey, privateKey }
}

export const signHash = async (vaultKey: Uint8Array, hash: string) => {
  const sodium = await getSodium()
  const { privateKey, publicKey } = await loadSigningKeys(vaultKey)
  const signature = sodium.crypto_sign_detached(sodium.from_string(hash), privateKey)

  sodium.memzero(privateKey)

  return {
    signature: sodium.to_base64(signature, sodium.base64_variants.ORIGINAL),
    publicKey: sodium.to_base64(publicKey, sodium.base64_variants.ORIGINAL),
  }
}
