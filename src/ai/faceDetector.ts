import type { FaceDetectorResult, ImageSource } from '@mediapipe/tasks-vision'

const DEFAULT_BASE_PATH = '/mediapipe'
const DEFAULT_MODEL_NAME = 'face_detector.task'

export type FaceDetectorInit = {
  basePath?: string
  modelPath?: string
  minDetectionConfidence?: number
  minSuppressionThreshold?: number
}

type FaceDetectorInstance = import('@mediapipe/tasks-vision').FaceDetector

let detectorPromise: Promise<FaceDetectorInstance> | null = null

export async function initFaceDetector(
  options: FaceDetectorInit = {},
): Promise<FaceDetectorInstance> {
  if (detectorPromise) return detectorPromise

  detectorPromise = (async () => {
    const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const basePath = options.basePath ?? DEFAULT_BASE_PATH
    const modelPath = options.modelPath ?? `${basePath}/${DEFAULT_MODEL_NAME}`

    const wasmFileset = await FilesetResolver.forVisionTasks(basePath)

    return FaceDetector.createFromOptions(wasmFileset, {
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

export async function detectFaces(
  image: ImageSource,
  options?: FaceDetectorInit,
): Promise<FaceDetectorResult> {
  const detector = await initFaceDetector(options)
  return detector.detect(image)
}
