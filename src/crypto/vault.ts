import { db } from '../db'
import type { VaultKdfParams, VaultMeta, WrappedVaultKey } from '../db'
import { getSodium } from './sodium'

type CreateVaultInput = {
  vaultName: string
  passphrase: string
}

export async function createVault({ vaultName, passphrase }: CreateVaultInput) {
  const sodium = await getSodium()

  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)
  const opslimit = sodium.crypto_pwhash_OPSLIMIT_MODERATE
  const memlimit = sodium.crypto_pwhash_MEMLIMIT_MODERATE
  const keyBytes = sodium.crypto_secretbox_KEYBYTES
  const alg = sodium.crypto_pwhash_ALG_ARGON2ID13

  const masterKey = sodium.crypto_pwhash(keyBytes, passphrase, salt, opslimit, memlimit, alg)
  const vaultKey = sodium.randombytes_buf(keyBytes)

  const signingKeypair = sodium.crypto_sign_keypair()
  const signingNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const signingCipher = sodium.crypto_secretbox_easy(
    signingKeypair.privateKey,
    signingNonce,
    vaultKey
  )

  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const cipher = sodium.crypto_secretbox_easy(vaultKey, nonce, masterKey)

  const kdfParams: VaultKdfParams = {
    alg: 'argon2id',
    opslimit,
    memlimit,
    saltBytes: sodium.crypto_pwhash_SALTBYTES,
    keyBytes,
  }

  const wrappedVaultKey: WrappedVaultKey = {
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
    cipher: sodium.to_base64(cipher, sodium.base64_variants.ORIGINAL),
  }

  const wrappedSigningKey: WrappedVaultKey = {
    nonce: sodium.to_base64(signingNonce, sodium.base64_variants.ORIGINAL),
    cipher: sodium.to_base64(signingCipher, sodium.base64_variants.ORIGINAL),
  }

  const now = Date.now()
  const vaultMeta: VaultMeta = {
    id: 'primary',
    createdAt: now,
    updatedAt: now,
    vaultName,
    status: 'unlocked',
    salt: sodium.to_base64(salt, sodium.base64_variants.ORIGINAL),
    kdfParams,
    wrappedVaultKey,
    signingPublicKey: sodium.to_base64(
      signingKeypair.publicKey,
      sodium.base64_variants.ORIGINAL
    ),
    wrappedSigningKey,
  }

  await db.vault_meta.put(vaultMeta)

  const vaultKeyCopy = vaultKey.slice()
  sodium.memzero(masterKey)
  sodium.memzero(vaultKey)
  sodium.memzero(signingKeypair.privateKey)

  return { vaultMeta, vaultKey: vaultKeyCopy }
}

type UnlockVaultResult = {
  vaultMeta: VaultMeta
  vaultKey: Uint8Array
}

export async function unlockVault(passphrase: string): Promise<UnlockVaultResult> {
  const sodium = await getSodium()
  const vaultMeta = await db.vault_meta.get('primary')

  if (!vaultMeta?.salt || !vaultMeta.kdfParams || !vaultMeta.wrappedVaultKey) {
    throw new Error('Vault metadata is missing')
  }

  const salt = sodium.from_base64(vaultMeta.salt, sodium.base64_variants.ORIGINAL)
  const { opslimit, memlimit, keyBytes } = vaultMeta.kdfParams
  const alg = sodium.crypto_pwhash_ALG_ARGON2ID13

  const masterKey = sodium.crypto_pwhash(keyBytes, passphrase, salt, opslimit, memlimit, alg)
  const nonce = sodium.from_base64(
    vaultMeta.wrappedVaultKey.nonce,
    sodium.base64_variants.ORIGINAL
  )
  const cipher = sodium.from_base64(
    vaultMeta.wrappedVaultKey.cipher,
    sodium.base64_variants.ORIGINAL
  )

  try {
    const vaultKey = sodium.crypto_secretbox_open_easy(cipher, nonce, masterKey)
    if (!vaultKey) {
      throw new Error('Invalid passphrase')
    }
    return { vaultMeta, vaultKey }
  } catch (error) {
    throw new Error('Invalid passphrase')
  } finally {
    sodium.memzero(masterKey)
  }
}
