import type { RedactionRect } from './RedactionCanvas'

type PixelateOptions = {
  mimeType?: string
  quality?: number
  scale?: number
}

export async function pixelateImage(
  imageUrl: string,
  rects: RedactionRect[],
  { mimeType, quality = 0.92, scale = 0.08 }: PixelateOptions = {}
): Promise<Blob> {
  const image = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Unable to create canvas context')
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  const temp = document.createElement('canvas')
  const tctx = temp.getContext('2d')
  if (!tctx) {
    throw new Error('Unable to create temp context')
  }

  rects.forEach((rect) => {
    const normalized = normalizeRect(rect, canvas.width, canvas.height)
    if (normalized.width < 1 || normalized.height < 1) return

    const sw = Math.max(1, Math.floor(normalized.width * scale))
    const sh = Math.max(1, Math.floor(normalized.height * scale))

    temp.width = sw
    temp.height = sh

    tctx.imageSmoothingEnabled = true
    tctx.clearRect(0, 0, sw, sh)
    tctx.drawImage(
      canvas,
      normalized.x,
      normalized.y,
      normalized.width,
      normalized.height,
      0,
      0,
      sw,
      sh
    )

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(temp, 0, 0, sw, sh, normalized.x, normalized.y, normalized.width, normalized.height)
  })

  const outputMime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputMime, outputMime === 'image/jpeg' ? quality : undefined)
  )

  if (!blob) {
    throw new Error('Unable to generate redacted image')
  }

  return blob
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load image'))
    image.src = url
  })

const normalizeRect = (rect: RedactionRect, maxWidth: number, maxHeight: number) => {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x
  const y = rect.height < 0 ? rect.y + rect.height : rect.y
  const width = Math.abs(rect.width)
  const height = Math.abs(rect.height)

  const clampedX = Math.max(0, Math.min(x, maxWidth))
  const clampedY = Math.max(0, Math.min(y, maxHeight))
  const clampedWidth = Math.max(0, Math.min(width, maxWidth - clampedX))
  const clampedHeight = Math.max(0, Math.min(height, maxHeight - clampedY))

  return { x: clampedX, y: clampedY, width: clampedWidth, height: clampedHeight }
}
