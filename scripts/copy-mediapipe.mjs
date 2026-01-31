import { copyFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = resolve(fileURLToPath(new URL('.', import.meta.url)))
const root = resolve(__dirname, '..')
const srcDir = resolve(root, 'node_modules/@mediapipe/tasks-vision/wasm')
const destDir = resolve(root, 'public/mediapipe')

const wasmFiles = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]
const bundleFiles = ['vision_bundle.cjs']

if (!existsSync(srcDir)) {
  console.warn('[mediapipe] wasm source not found:', srcDir)
  console.warn('[mediapipe] run `pnpm install` before copying assets')
  process.exit(0)
}

await mkdir(destDir, { recursive: true })

await Promise.all(
  [...wasmFiles, ...bundleFiles].map(async (file) => {
    const from =
      file === 'vision_bundle.cjs'
        ? resolve(root, 'node_modules/@mediapipe/tasks-vision', file)
        : resolve(srcDir, file)
    const to = resolve(destDir, file)
    await copyFile(from, to)
  })
)

console.log('[mediapipe] MediaPipe assets copied to public/mediapipe')
