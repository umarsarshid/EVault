import type { FaceDetectorInit } from './faceDetector'

type FaceBox = {
  x: number
  y: number
  width: number
  height: number
}

type WorkerResponse = {
  id: number
  rects?: FaceBox[]
  scores?: number[]
  error?: string
}

type PendingRequest = {
  resolve: (value: { rects: FaceBox[]; scores: number[] }) => void
  reject: (reason?: Error) => void
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, PendingRequest>()

const getWorker = () => {
  if (!worker) {
    worker = new Worker(new URL('../workers/faceDetect.worker.ts', import.meta.url), {
      type: 'classic',
    })

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { id, rects, scores, error } = event.data
      const entry = pending.get(id)
      if (!entry) return
      pending.delete(id)

      if (error) {
        entry.reject(new Error(error))
        return
      }

      entry.resolve({ rects: rects ?? [], scores: scores ?? [] })
    }

    worker.onerror = () => {
      pending.forEach((entry) => entry.reject(new Error('Face detection worker error.')))
      pending.clear()
    }
  }

  return worker
}

export const detectFacesInWorker = (
  image: ImageBitmap,
  options?: FaceDetectorInit
): Promise<{ rects: FaceBox[]; scores: number[] }> => {
  const id = nextId++

  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, image, options }, [image])
  })
}
