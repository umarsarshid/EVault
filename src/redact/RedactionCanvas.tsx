import { useEffect, useRef, useState } from 'react'

export type RedactionRect = {
  x: number
  y: number
  width: number
  height: number
}

type Props = {
  imageUrl: string
  initialRects?: RedactionRect[]
  suggestions?: SuggestedRedaction[]
  onChange?: (rects: RedactionRect[]) => void
}

export type SuggestedRedaction = {
  rect: RedactionRect
  included: boolean
}

const MIN_RECT_SIZE = 6

export default function RedactionCanvas({
  imageUrl,
  initialRects,
  suggestions = [],
  onChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [rects, setRects] = useState<RedactionRect[]>([])
  const [draft, setDraft] = useState<RedactionRect | null>(null)

  useEffect(() => {
    setRects(initialRects ?? [])
    setDraft(null)
  }, [imageUrl, initialRects])

  useEffect(() => {
    const img = new Image()
    img.src = imageUrl
    img.onload = () => {
      imageRef.current = img
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      draw(canvas, img, rects, draft, suggestions)
    }
  }, [imageUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    draw(canvas, img, rects, draft, suggestions)
  }, [rects, draft, suggestions])

  useEffect(() => {
    onChange?.(rects)
  }, [rects, onChange])

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    const scaleX = canvas.width / bounds.width
    const scaleY = canvas.height / bounds.height
    const x = (event.clientX - bounds.left) * scaleX
    const y = (event.clientY - bounds.top) * scaleY
    return { x, y }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const start = getPoint(event)
    setDraft({ x: start.x, y: start.y, width: 0, height: 0 })
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draft) return
    const current = getPoint(event)
    const width = current.x - draft.x
    const height = current.y - draft.y
    setDraft({ x: draft.x, y: draft.y, width, height })
  }

  const handlePointerUp = () => {
    if (!draft) return
    const normalized = normalizeRect(draft)
    if (normalized.width >= MIN_RECT_SIZE && normalized.height >= MIN_RECT_SIZE) {
      setRects((prev) => [...prev, normalized])
    }
    setDraft(null)
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-sand-200 bg-sand-100 dark:border-sand-700 dark:bg-sand-900/60">
        <canvas
          ref={canvasRef}
          className="block h-auto w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-sand-600 dark:text-sand-400">
        <span>Drag to draw redaction rectangles.</span>
        <span>{rects.length} region{rects.length === 1 ? '' : 's'}</span>
      </div>
    </div>
  )
}

const normalizeRect = (rect: RedactionRect): RedactionRect => {
  const x = rect.width < 0 ? rect.x + rect.width : rect.x
  const y = rect.height < 0 ? rect.y + rect.height : rect.y
  const width = Math.abs(rect.width)
  const height = Math.abs(rect.height)
  return { x, y, width, height }
}

const draw = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  rects: RedactionRect[],
  draft: RedactionRect | null,
  suggestions: SuggestedRedaction[]
) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  if (suggestions.length > 0) {
    ctx.save()
    ctx.setLineDash([8, 6])
    ctx.lineWidth = 2
    suggestions.forEach((suggestion) => {
      const { rect, included } = suggestion
      ctx.strokeStyle = included ? 'rgba(16, 120, 85, 0.9)' : 'rgba(120, 116, 110, 0.7)'
      ctx.fillStyle = included ? 'rgba(16, 120, 85, 0.15)' : 'transparent'
      if (included) {
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
      }
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    })
    ctx.restore()
  }

  ctx.save()
  ctx.fillStyle = 'rgba(20, 18, 16, 0.45)'
  ctx.strokeStyle = 'rgba(20, 18, 16, 0.8)'
  ctx.lineWidth = 2

  rects.forEach((rect) => {
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
  })

  if (draft) {
    const normalized = normalizeRect(draft)
    ctx.fillRect(normalized.x, normalized.y, normalized.width, normalized.height)
    ctx.strokeRect(normalized.x, normalized.y, normalized.width, normalized.height)
  }

  ctx.restore()
}
