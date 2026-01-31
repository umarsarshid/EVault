/// <reference lib="webworker" />

type WorkerDetectOptions = {
  basePath?: string
  modelPath?: string
  minDetectionConfidence?: number
  minSuppressionThreshold?: number
}

type DetectRequest = {
  id: number
  image: ImageBitmap
  options?: WorkerDetectOptions
}

type DetectResponse = {
  id: number
  rects?: Array<{ x: number; y: number; width: number; height: number }>
  scores?: number[]
  error?: string
}

type VisionModule = {
  FaceDetector: {
    createFromOptions: (
      fileset: unknown,
      options: Record<string, unknown>
    ) => Promise<{ detect: (image: ImageBitmap) => { detections: Array<any> } }>
  }
  FilesetResolver: {
    forVisionTasks: (basePath?: string) => Promise<unknown>
  }
}

const DEFAULT_BASE_PATH = '/mediapipe'
const DEFAULT_MODEL_NAME = 'face_detector.task'

let detectorPromise: Promise<{ detect: (image: ImageBitmap) => { detections: Array<any> } }> | null =
  null
let visionModule: VisionModule | null = null

const loadVisionModule = (basePath: string) => {
  if (visionModule) return visionModule

  const scope = self as unknown as {
    module?: { exports?: unknown }
    exports?: unknown
    importScripts?: (...urls: string[]) => void
  }

  if (!scope.importScripts) {
    throw new Error('importScripts is not available in this worker context')
  }

  scope.module = { exports: {} }
  scope.exports = scope.module.exports
  scope.importScripts(`${basePath}/vision_bundle.cjs`)
  visionModule = scope.module.exports as VisionModule

  return visionModule
}

const initDetector = async (options: WorkerDetectOptions = {}) => {
  if (detectorPromise) return detectorPromise

  detectorPromise = (async () => {
    const basePath = options.basePath ?? DEFAULT_BASE_PATH
    const modelPath = options.modelPath ?? `${basePath}/${DEFAULT_MODEL_NAME}`
    const vision = loadVisionModule(basePath)
    const fileset = await vision.FilesetResolver.forVisionTasks(basePath)
    return vision.FaceDetector.createFromOptions(fileset, {
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

self.onmessage = async (event: MessageEvent<DetectRequest>) => {
  const { id, image, options } = event.data

  try {
    const detector = await initDetector(options)
    const result = detector.detect(image)

    const rects: Array<{ x: number; y: number; width: number; height: number }> = []
    const scores: number[] = []

    result.detections.forEach((detection) => {
      const box = detection.boundingBox
      if (!box) return
      const categoryScores = detection.categories.map((category: { score?: number }) =>
        category.score ?? 0
      )
      const score = categoryScores.length ? Math.max(...categoryScores) : 0
      rects.push({
        x: box.originX,
        y: box.originY,
        width: box.width,
        height: box.height,
      })
      scores.push(score)
    })

    image.close?.()

    const response: DetectResponse = { id, rects, scores }
    self.postMessage(response)
  } catch (err) {
    const response: DetectResponse = {
      id,
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(response)
  }
}
