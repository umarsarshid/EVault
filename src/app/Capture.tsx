import { useEffect, useRef, useState } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'

const MAX_VIDEO_SECONDS = 60

const pickVideoMimeType = () => {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]

  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return ''
}

const pickAudioMimeType = () => {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']

  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return ''
}

export default function Capture() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const intervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const audioRecorderRef = useRef<MediaRecorder | null>(null)

  const [isStreaming, setIsStreaming] = useState(false)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoBytes, setVideoBytes] = useState(0)
  const [videoSeconds, setVideoSeconds] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBytes, setAudioBytes] = useState(0)
  const [audioSeconds, setAudioSeconds] = useState(0)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: true,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setIsStreaming(true)
        }
      } catch (err) {
        console.error(err)
        setError('Camera access denied or unavailable.')
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
        audioRecorderRef.current.stop()
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    }
  }, [photoUrl])

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const handleCapture = async () => {
    const video = videoRef.current
    if (!video) return

    const width = video.videoWidth
    const height = video.videoHeight

    if (!width || !height) {
      setError('Camera not ready yet.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Unable to capture photo.')
      return
    }

    ctx.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    )

    if (!blob) {
      setError('Unable to capture photo.')
      return
    }

    if (photoUrl) {
      URL.revokeObjectURL(photoUrl)
    }

    setPhotoBlob(blob)
    setPhotoUrl(URL.createObjectURL(blob))
    setError(null)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (photoUrl) {
      URL.revokeObjectURL(photoUrl)
    }
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }

    if (file.type.startsWith('image/')) {
      setPhotoBlob(file)
      setPhotoUrl(URL.createObjectURL(file))
    } else if (file.type.startsWith('video/')) {
      setVideoBlob(file)
      setVideoUrl(URL.createObjectURL(file))
      setVideoBytes(file.size)
    } else if (file.type.startsWith('audio/')) {
      setAudioBlob(file)
      setAudioUrl(URL.createObjectURL(file))
      setAudioBytes(file.size)
    } else {
      setError('Unsupported file type.')
    }

    event.target.value = ''
  }

  const resetVideoState = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
    }
    setVideoBlob(null)
    setVideoUrl(null)
    setVideoBytes(0)
    setVideoSeconds(0)
  }

  const startRecording = async () => {
    if (!isStreaming || !videoRef.current) return

    const stream = videoRef.current.srcObject
    if (!stream || !(stream instanceof MediaStream)) {
      setError('Camera not ready for recording.')
      return
    }

    const mimeType = pickVideoMimeType()
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
        const total = chunks.reduce((sum, chunk) => sum + chunk.size, 0)
        setVideoBytes(total)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' })
      setVideoBlob(blob)
      setVideoUrl(URL.createObjectURL(blob))
      setIsRecording(false)
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }

    resetVideoState()
    setError(null)
    setIsRecording(true)
    setVideoSeconds(0)
    recorderRef.current = recorder

    recorder.start(1000)

    intervalRef.current = window.setInterval(() => {
      setVideoSeconds((seconds) => seconds + 1)
    }, 1000)

    timeoutRef.current = window.setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
    }, MAX_VIDEO_SECONDS * 1000)
  }

  const stopRecording = () => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
  }

  const resetAudioState = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setAudioBytes(0)
    setAudioSeconds(0)
  }

  const startAudioRecording = async () => {
    if (!isStreaming || !videoRef.current) return

    const stream = videoRef.current.srcObject
    if (!stream || !(stream instanceof MediaStream)) {
      setError('Microphone not ready for recording.')
      return
    }

    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) {
      setError('Microphone not available.')
      return
    }

    const audioStream = new MediaStream(audioTracks)
    const mimeType = pickAudioMimeType()
    const recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
        const total = chunks.reduce((sum, chunk) => sum + chunk.size, 0)
        setAudioBytes(total)
      }
    }

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
      setAudioBlob(blob)
      setAudioUrl(URL.createObjectURL(blob))
      setIsRecordingAudio(false)
    }

    resetAudioState()
    setError(null)
    setIsRecordingAudio(true)
    setAudioSeconds(0)
    audioRecorderRef.current = recorder

    recorder.start(1000)

    const interval = window.setInterval(() => {
      setAudioSeconds((seconds) => seconds + 1)
    }, 1000)

    const stopTimer = window.setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
      window.clearInterval(interval)
    }, MAX_VIDEO_SECONDS * 1000)

    recorder.addEventListener('stop', () => {
      window.clearInterval(interval)
      window.clearTimeout(stopTimer)
    })
  }

  const stopAudioRecording = () => {
    const recorder = audioRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-sand-600 dark:text-sand-400">
          Capture
        </p>
        <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">
          Record new evidence
        </h1>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Capture a photo, audio note, or short video clip. Raw blobs stay in memory for now.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card title="Camera preview" description="Grant camera access to continue.">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-sand-200 bg-sand-100 dark:border-sand-700 dark:bg-sand-800">
                <video
                  ref={videoRef}
                  className="aspect-video w-full object-cover"
                  playsInline
                  muted
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleCapture} disabled={!isStreaming}>
                  Take photo
                </Button>
                <Button variant="outline" onClick={() => setPhotoBlob(null)} disabled={!photoBlob}>
                  Reset photo
                </Button>
              </div>
              {!isStreaming && !error && (
                <p className="text-xs text-sand-600 dark:text-sand-400">Waiting for camera…</p>
              )}
              {error && <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>}
            </div>
          </Card>

          <Card title="Video capture" description="Record a short clip (max 60 seconds).">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={startRecording} disabled={!isStreaming || isRecording}>
                  Start recording
                </Button>
                <Button variant="outline" onClick={stopRecording} disabled={!isRecording}>
                  Stop recording
                </Button>
                <Button variant="ghost" onClick={resetVideoState} disabled={isRecording}>
                  Clear clip
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-sand-600 dark:text-sand-400">
                <span>{isRecording ? 'Recording…' : 'Idle'}</span>
                <span>
                  Duration: {videoSeconds}s / {MAX_VIDEO_SECONDS}s
                </span>
                <span>Size: {Math.max(1, Math.round(videoBytes / 1024))} KB</span>
              </div>
              {videoUrl && (
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-2xl border border-sand-200 dark:border-sand-700"
                />
              )}
            </div>
          </Card>

          <Card title="Audio capture" description="Record an audio note (max 60 seconds).">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={startAudioRecording} disabled={!isStreaming || isRecordingAudio}>
                  Start audio
                </Button>
                <Button variant="outline" onClick={stopAudioRecording} disabled={!isRecordingAudio}>
                  Stop audio
                </Button>
                <Button variant="ghost" onClick={resetAudioState} disabled={isRecordingAudio}>
                  Clear audio
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-sand-600 dark:text-sand-400">
                <span>{isRecordingAudio ? 'Recording…' : 'Idle'}</span>
                <span>
                  Duration: {audioSeconds}s / {MAX_VIDEO_SECONDS}s
                </span>
                <span>Size: {Math.max(1, Math.round(audioBytes / 1024))} KB</span>
              </div>
              <div className="h-24 overflow-hidden rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-4 py-3 text-xs text-sand-600 dark:border-sand-600 dark:bg-sand-900/60 dark:text-sand-400">
                <div className="flex h-full items-center justify-between">
                  <span>Waveform placeholder</span>
                  <span className="font-mono">▂▅▃▆▁▇▂▆▃▅▂▃</span>
                </div>
              </div>
              {audioUrl && <audio src={audioUrl} controls className="w-full" />}
            </div>
          </Card>

          <Card
            title="Fallback import"
            description="Use a file from your device if camera APIs are limited."
          >
            <div className="space-y-3">
              <input
                type="file"
                accept="image/*,video/*,audio/*"
                onChange={handleImport}
                className="block w-full text-sm text-sand-600 file:mr-4 file:rounded-full file:border-0 file:bg-sand-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-sand-800 dark:text-sand-300 dark:file:bg-sand-100 dark:file:text-sand-900 dark:hover:file:bg-sand-200"
              />
              <p className="text-xs text-sand-600 dark:text-sand-400">
                Imported files stay in memory until you save them to the vault.
              </p>
            </div>
          </Card>
        </div>

        <Card
          title="Captured photo"
          description="Stored in memory only. Not saved to the vault yet."
        >
          {photoUrl ? (
            <div className="space-y-3">
              <img
                src={photoUrl}
                alt="Captured evidence"
                className="w-full rounded-2xl border border-sand-200 object-cover dark:border-sand-700"
              />
              <div className="text-xs text-sand-600 dark:text-sand-400">
                {photoBlob
                  ? `${photoBlob.type || 'image/jpeg'} · ${Math.round(photoBlob.size / 1024)} KB`
                  : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-sand-600 dark:text-sand-400">
              No photo captured yet. Take a photo to preview it here.
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
