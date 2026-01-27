import sodium from 'libsodium-wrappers'

let initPromise: Promise<typeof sodium> | null = null
let ready = false

export async function initSodium() {
  if (!initPromise) {
    initPromise = sodium.ready.then(() => {
      ready = true
      console.info('[crypto] libsodium ready')
      return sodium
    })
  }

  return initPromise
}

export function isSodiumReady() {
  return ready
}

export async function getSodium() {
  return initSodium()
}
