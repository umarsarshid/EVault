import { useEffect, useRef, useState } from 'react'

export type RedactionRect = {
  x: number
  y: number
  width: number
  height: number
}

export type SuggestedRedaction = {
  rect: RedactionRect
  included: boolean
}

type Props = {
  imageUrl: string
  initialRects?: RedactionRect[]
  rects?: RedactionRect[]
  suggestions?: SuggestedRedaction[]
  onChange?: (rects: RedactionRect[]) => void
}

const MIN_RECT_SIZE = 6
const HANDLE_SIZE = 10

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

type DragState =
  | {
      mode: 'draw'
      startX: number
      startY: number
    }
  | {
      mode: 'move'
      index: number
      offsetX: number
      offsetY: number
    }
  | {
      mode: 'resize'
      index: number
      handle: ResizeHandle
      originRect: RedactionRect
    }

export default function RedactionCanvas({
  imageUrl,
  initialRects,
  rects: controlledRects,
  suggestions = [],
  onChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [internalRects, setInternalRects] = useState<RedactionRect[]>([])
  const [draft, setDraft] = useState<RedactionRect | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const isControlled = controlledRects !== undefined
  const rects = controlledRects ?? internalRects

  useEffect(() => {
    if (!isControlled) {
      setInternalRects(initialRects ?? [])
    }
    setDraft(null)
    setSelectedIndex(null)
    setDragState(null)
  }, [imageUrl, initialRects, isControlled])

  useEffect(() => {
    const img = new Image()
    img.src = imageUrl
    img.onload = () => {
      imageRef.current = img
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      draw(canvas, img, rects, draft, suggestions, selectedIndex)
    }
  }, [imageUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    draw(canvas, img, rects, draft, suggestions, selectedIndex)
  }, [rects, draft, suggestions, selectedIndex])

  const updateRects = (next: RedactionRect[]) => {
    if (!isControlled) {
      setInternalRects(next)
    }
    onChange?.(next)
  }

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

    const handleHit = findHandleHit(start, rects)
    if (handleHit) {
      setSelectedIndex(handleHit.index)
      setDragState({
        mode: 'resize',
        index: handleHit.index,
        handle: handleHit.handle,
        originRect: rects[handleHit.index],
      })
      return
    }

    const rectIndex = findRectHit(start, rects)
    if (rectIndex !== null) {
      const rect = rects[rectIndex]
      setSelectedIndex(rectIndex)
      setDragState({
        mode: 'move',
        index: rectIndex,
        offsetX: start.x - rect.x,
        offsetY: start.y - rect.y,
      })
      return
    }

    setSelectedIndex(null)
    setDraft({ x: start.x, y: start.y, width: 0, height: 0 })
    setDragState({ mode: 'draw', startX: start.x, startY: start.y })
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragState) return
    const current = getPoint(event)

    if (dragState.mode === 'draw') {
      if (!draft) return
      const width = current.x - dragState.startX
      const height = current.y - dragState.startY
      setDraft({ x: dragState.startX, y: dragState.startY, width, height })
      return
    }

    if (dragState.mode === 'move') {
      const canvas = canvasRef.current
      if (!canvas) return
      const next = clampRect(
        {
          ...rects[dragState.index],
          x: current.x - dragState.offsetX,
          y: current.y - dragState.offsetY,
        },
        canvas
      )
      updateRects(rects.map((rect, idx) => (idx === dragState.index ? next : rect)))
      return
    }

    if (dragState.mode === 'resize') {
      const canvas = canvasRef.current
      if (!canvas) return
      const resized = resizeRect(dragState.originRect, current, dragState.handle)
      const normalized = normalizeRect(resized)
      if (normalized.width < MIN_RECT_SIZE || normalized.height < MIN_RECT_SIZE) return
      const next = clampRect(normalized, canvas)
      updateRects(rects.map((rect, idx) => (idx === dragState.index ? next : rect)))
    }
  }

  const handlePointerUp = () => {
    if (dragState?.mode === 'draw' && draft) {
      const normalized = normalizeRect(draft)
      if (normalized.width >= MIN_RECT_SIZE && normalized.height >= MIN_RECT_SIZE) {
        const next = [...rects, normalized]
        updateRects(next)
        setSelectedIndex(next.length - 1)
      }
    }
    setDraft(null)
    setDragState(null)
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
        <span>Drag to draw, click to move, drag corners to resize.</span>
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
  suggestions: SuggestedRedaction[],
  selectedIndex: number | null
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

  rects.forEach((rect, index) => {
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    if (selectedIndex === index) {
      drawHandles(ctx, rect)
    }
  })

  if (draft) {
    const normalized = normalizeRect(draft)
    ctx.fillRect(normalized.x, normalized.y, normalized.width, normalized.height)
    ctx.strokeRect(normalized.x, normalized.y, normalized.width, normalized.height)
  }

  ctx.restore()
}

const findRectHit = (point: { x: number; y: number }, rects: RedactionRect[]) => {
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const rect = rects[i]
    if (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    ) {
      return i
    }
  }
  return null
}

const findHandleHit = (point: { x: number; y: number }, rects: RedactionRect[]) => {
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const rect = rects[i]
    const handles = getHandles(rect)
    for (const handle of handles) {
      if (
        point.x >= handle.x &&
        point.x <= handle.x + handle.size &&
        point.y >= handle.y &&
        point.y <= handle.y + handle.size
      ) {
        return { index: i, handle: handle.name }
      }
    }
  }
  return null
}

const getHandles = (rect: RedactionRect) => {
  const size = HANDLE_SIZE
  const half = size / 2
  return [
    { name: 'nw' as const, x: rect.x - half, y: rect.y - half, size },
    { name: 'ne' as const, x: rect.x + rect.width - half, y: rect.y - half, size },
    { name: 'sw' as const, x: rect.x - half, y: rect.y + rect.height - half, size },
    {
      name: 'se' as const,
      x: rect.x + rect.width - half,
      y: rect.y + rect.height - half,
      size,
    },
  ]
}

const drawHandles = (ctx: CanvasRenderingContext2D, rect: RedactionRect) => {
  const handles = getHandles(rect)
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.strokeStyle = 'rgba(20, 18, 16, 0.85)'
  handles.forEach((handle) => {
    ctx.fillRect(handle.x, handle.y, handle.size, handle.size)
    ctx.strokeRect(handle.x, handle.y, handle.size, handle.size)
  })
  ctx.restore()
}

const clampRect = (rect: RedactionRect, canvas: HTMLCanvasElement): RedactionRect => {
  const width = Math.min(rect.width, canvas.width)
  const height = Math.min(rect.height, canvas.height)
  const maxX = canvas.width - width
  const maxY = canvas.height - height
  return {
    x: Math.max(0, Math.min(maxX, rect.x)),
    y: Math.max(0, Math.min(maxY, rect.y)),
    width,
    height,
  }
}

const resizeRect = (rect: RedactionRect, point: { x: number; y: number }, handle: ResizeHandle) => {
  switch (handle) {
    case 'nw':
      return {
        x: point.x,
        y: point.y,
        width: rect.x + rect.width - point.x,
        height: rect.y + rect.height - point.y,
      }
    case 'ne':
      return {
        x: rect.x,
        y: point.y,
        width: point.x - rect.x,
        height: rect.y + rect.height - point.y,
      }
    case 'sw':
      return {
        x: point.x,
        y: rect.y,
        width: rect.x + rect.width - point.x,
        height: point.y - rect.y,
      }
    case 'se':
      return {
        x: rect.x,
        y: rect.y,
        width: point.x - rect.x,
        height: point.y - rect.y,
      }
  }
}
