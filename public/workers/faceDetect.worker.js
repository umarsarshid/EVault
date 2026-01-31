/* global self, importScripts */
/* eslint-disable no-restricted-globals */

const scope = self

if (!scope.module) {
  scope.exports = {}
  scope.module = { exports: scope.exports }
}

const DEFAULT_BASE_PATH = '/mediapipe'
const DEFAULT_MODEL_NAME = 'face_detector.task'

let detectorPromise = null

const loadBundle = () => {
  if (scope.__evvaultVisionBundleLoaded) return
  importScripts('/mediapipe/vision_bundle.cjs')
  scope.__evvaultVisionBundleLoaded = true
}

const initDetector = async (options = {}) => {
  if (detectorPromise) return detectorPromise

  detectorPromise = (async () => {
    loadBundle()
    const { FaceDetector, FilesetResolver } = scope.module.exports
    const basePath = options.basePath || DEFAULT_BASE_PATH
    const modelPath = options.modelPath || `${basePath}/${DEFAULT_MODEL_NAME}`
    const fileset = await FilesetResolver.forVisionTasks(basePath)

    return FaceDetector.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: modelPath },
      runningMode: 'IMAGE',
      minDetectionConfidence: options.minDetectionConfidence,
      minSuppressionThreshold: options.minSuppressionThreshold,
    })
  })()

  try {
    return await detectorPromise
  } catch (error) {
    detectorPromise = null
    throw error
  }
}

scope.onmessage = async (event) => {
  const { id, image, options } = event.data

  try {
    const detector = await initDetector(options)
    const result = detector.detect(image)

    const rects = []
    const scores = []

    result.detections.forEach((detection) => {
      const box = detection.boundingBox
      if (!box) return
      const categoryScores = detection.categories.map((category) => category.score ?? 0)
      const score = categoryScores.length ? Math.max(...categoryScores) : 0
      rects.push({
        x: box.originX,
        y: box.originY,
        width: box.width,
        height: box.height,
      })
      scores.push(score)
    })

    if (image && typeof image.close === 'function') {
      image.close()
    }

    scope.postMessage({ id, rects, scores })
  } catch (err) {
    scope.postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
