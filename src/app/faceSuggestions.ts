import type { Detection, BoundingBox } from '@mediapipe/tasks-vision'
import type { RedactionRect } from '../redact/RedactionCanvas'

export type FaceSuggestion = {
  id: string
  rect: RedactionRect
  score: number
  included: boolean
}

function clampValue(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeBoundingBox(
  box: BoundingBox,
  maxWidth: number,
  maxHeight: number,
): RedactionRect | null {
  const x = clampValue(box.originX, 0, maxWidth)
  const y = clampValue(box.originY, 0, maxHeight)
  const width = Math.max(0, Math.min(maxWidth - x, box.width))
  const height = Math.max(0, Math.min(maxHeight - y, box.height))
  if (width <= 0 || height <= 0) {
    return null
  }
  return { x, y, width, height }
}

function normalizeRect(
  rect: RedactionRect,
  maxWidth: number,
  maxHeight: number,
): RedactionRect | null {
  const x = clampValue(rect.x, 0, maxWidth)
  const y = clampValue(rect.y, 0, maxHeight)
  const width = Math.max(0, Math.min(maxWidth - x, rect.width))
  const height = Math.max(0, Math.min(maxHeight - y, rect.height))
  if (width <= 0 || height <= 0) {
    return null
  }
  return { x, y, width, height }
}

export function convertDetectionsToRects(
  detections: Detection[],
  width: number,
  height: number,
) {
  const rects: RedactionRect[] = []
  const scores: number[] = []

  detections.forEach((detection) => {
    const box = detection.boundingBox
    if (!box) return
    const normalized = normalizeBoundingBox(box, width, height)
    if (!normalized) return
    const categoryScores = detection.categories.map((category) => category.score ?? 0)
    const score = categoryScores.length ? Math.max(...categoryScores) : 0
    rects.push(normalized)
    scores.push(score)
  })

  return { rects, scores }
}

export function clampRedactionRects(
  rects: RedactionRect[],
  width: number,
  height: number,
) {
  return rects
    .map((rect) => normalizeRect(rect, width, height))
    .filter((rect): rect is RedactionRect => Boolean(rect))
}

export function applyFaceSuggestions(
  existingRects: RedactionRect[],
  suggestions: FaceSuggestion[],
) {
  const accepted = suggestions.filter((suggestion) => suggestion.included)
  if (accepted.length === 0) {
    return {
      rects: existingRects,
      remaining: suggestions,
      added: 0,
    }
  }

  const remaining = suggestions.filter((suggestion) => !suggestion.included)
  const rects = [...existingRects, ...accepted.map((suggestion) => suggestion.rect)]

  return {
    rects,
    remaining,
    added: accepted.length,
  }
}

export function hydrateFaceSuggestions(
  boxes: RedactionRect[],
  detectedAt?: number,
) {
  return boxes.map((rect, index) => ({
    id: `stored-${detectedAt ?? 0}-${index}`,
    rect,
    score: 0,
    included: true,
  }))
}
