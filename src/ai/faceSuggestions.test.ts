import type { Detection } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import { applyFaceSuggestions, convertDetectionsToRects } from '../app/faceSuggestions'

describe('convertDetectionsToRects', () => {
  it('clamps bounding boxes and computes scores', () => {
    const detections: Detection[] = [
      {
        boundingBox: { originX: -10, originY: 5, width: 30, height: 20, angle: 0 },
        categories: [
          { score: 0.3, index: 0, categoryName: 'face', displayName: 'face' },
          { score: 0.65, index: 1, categoryName: 'face', displayName: 'face' },
        ],
        keypoints: [],
      },
      {
        boundingBox: { originX: 5, originY: 5, width: 10, height: 5, angle: 0 },
        categories: [{ score: 0.1, index: 0, categoryName: '', displayName: '' }],
        keypoints: [],
      },
    ]

    const { rects, scores } = convertDetectionsToRects(detections, 20, 15)

    expect(rects).toHaveLength(2)
    expect(rects[0]).toEqual({ x: 0, y: 5, width: 20, height: 10 })
    expect(rects[1]).toEqual({ x: 5, y: 5, width: 10, height: 5 })
    expect(scores).toEqual([0.65, 0.1])
  })
})

describe('applyFaceSuggestions', () => {
  it('adds included suggestions and keeps the rest', () => {
    const suggestions = [
      { id: 'a', rect: { x: 0, y: 0, width: 10, height: 10 }, score: 0.5, included: true },
      { id: 'b', rect: { x: 1, y: 1, width: 5, height: 5 }, score: 0.4, included: false },
    ]

    const result = applyFaceSuggestions([], suggestions)

    expect(result.rects).toEqual([{ x: 0, y: 0, width: 10, height: 10 }])
    expect(result.remaining).toEqual([
      { id: 'b', rect: { x: 1, y: 1, width: 5, height: 5 }, score: 0.4, included: false },
    ])
    expect(result.added).toBe(1)
  })
})
