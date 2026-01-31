import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { db } from '../db'
import { encryptBlob } from '../crypto/blob'
import { appendCustodyEvent } from '../custody'
import { useVault } from './VaultContext'

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

const getLocalDateTimeInputValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

const createItemId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `item_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export default function Capture() {
  const { vaultStatus, vaultKey } = useVault()
  const navigate = useNavigate()
  const [stepIndex, setStepIndex] = useState(0)
  const [what, setWhat] = useState('')
  const [when, setWhen] = useState(() => getLocalDateTimeInputValue(new Date()))
  const [where, setWhere] = useState('')
  const [notes, setNotes] = useState('')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [accuracy, setAccuracy] = useState('')
  const [locationTs, setLocationTs] = useState('')
  const [locationStatus, setLocationStatus] = useState<string | null>(null)

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
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [lastSavedItemId, setLastSavedItemId] = useState<string | null>(null)

  const steps = useMemo(() => ['Capture media', 'Prompts', 'Review & Save'], [])
  const hasMedia = Boolean(photoBlob || videoBlob || audioBlob)
  const promptsComplete =
    what.trim().length > 0 && when.trim().length > 0 && where.trim().length > 0

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

    setError(null)

    if (file.type.startsWith('image/')) {
      setPhotoBlob(file)
      setPhotoUrl(URL.createObjectURL(file))
    } else if (file.type.startsWith('video/')) {
      setVideoBlob(file)
      setVideoUrl(URL.createObjectURL(file))
      setVideoBytes(file.size)
      setVideoSeconds(0)
    } else if (file.type.startsWith('audio/')) {
      setAudioBlob(file)
      setAudioUrl(URL.createObjectURL(file))
      setAudioBytes(file.size)
      setAudioSeconds(0)
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

  const goNext = () => {
    setStepIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0))
  }

  const handleSave = async () => {
    if (!vaultKey) {
      setSaveMessage('Unlock the vault before saving.')
      return
    }

    const blob = photoBlob || videoBlob || audioBlob
    if (!blob) {
      setSaveMessage('Capture or import media before saving.')
      return
    }

    try {
      const encrypted = await encryptBlob(vaultKey, blob)
      const now = Date.now()
      const capturedAt = when ? new Date(when).getTime() : now

      const location =
        lat && lon
          ? {
              lat: Number.parseFloat(lat),
              lon: Number.parseFloat(lon),
              accuracy: accuracy ? Number.parseFloat(accuracy) : undefined,
              ts: locationTs ? new Date(locationTs).getTime() : undefined,
            }
          : undefined

      const itemId = createItemId()
      const itemType = photoBlob ? 'photo' : videoBlob ? 'video' : 'audio'

      await db.items.add({
        id: itemId,
        type: itemType,
        createdAt: now,
        capturedAt: Number.isNaN(capturedAt) ? now : capturedAt,
        encryptedBlob: {
          nonce: encrypted.nonce,
          cipher: encrypted.cipher,
        },
        blobMime: encrypted.mime,
        blobSize: encrypted.size,
        metadata: {
          what: what.trim(),
          where: where.trim(),
          notes: notes.trim() || undefined,
        },
        location,
      })

      await appendCustodyEvent({
        itemId,
        action: 'capture',
        vaultKey,
        details: {
          type: itemType,
          mime: encrypted.mime,
          size: encrypted.size,
        },
      })

      setSaveMessage('Saved encrypted item to the vault.')
      setLastSavedItemId(itemId)
    } catch (err) {
      console.error(err)
      setSaveMessage('Failed to save item. Try again.')
    }
  }

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported on this device.')
      return
    }

    setLocationStatus('Requesting location permission…')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: geoAccuracy } = position.coords
        setLat(latitude.toFixed(6))
        setLon(longitude.toFixed(6))
        setAccuracy(Math.round(geoAccuracy).toString())
        setLocationTs(getLocalDateTimeInputValue(new Date(position.timestamp)))
        setLocationStatus('Location captured (optional).')
      },
      (error) => {
        console.error(error)
        setLocationStatus('Unable to capture location. You can enter it manually or skip.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const saveDisabled = vaultStatus !== 'unlocked' || !hasMedia || !vaultKey

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sand-600 dark:text-sand-400">
              Capture
            </p>
            <h1 className="text-3xl font-semibold text-sand-900 dark:text-sand-50">
              Capture wizard
            </h1>
          </div>
          <div className="rounded-full border border-sand-200 bg-white/70 px-4 py-2 text-xs text-sand-600 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-400">
            Step {stepIndex + 1} of {steps.length}
          </div>
        </div>
        <p className="text-sm text-sand-700 dark:text-sand-300">
          Capture a photo, audio note, or short video clip, then document what happened.
        </p>
        <div className="flex flex-wrap gap-2">
          {steps.map((label, index) => (
            <span
              key={label}
              className={[
                'rounded-full border px-3 py-1 text-xs font-medium',
                index === stepIndex
                  ? 'border-sand-900 bg-sand-900 text-white dark:border-sand-100 dark:bg-sand-100 dark:text-sand-900'
                  : 'border-sand-200 bg-white/60 text-sand-600 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-300',
              ].join(' ')}
            >
              {label}
            </span>
          ))}
        </div>
      </header>

      {stepIndex === 0 && (
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
            title="Captured media"
            description="Stored in memory only. Not saved to the vault yet."
          >
            <div className="space-y-4">
              {photoUrl && (
                <div className="space-y-2">
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
              )}
              {videoUrl && (
                <div className="space-y-2">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full rounded-2xl border border-sand-200 dark:border-sand-700"
                  />
                  <div className="text-xs text-sand-600 dark:text-sand-400">
                    {videoBlob
                      ? `${videoBlob.type || 'video/webm'} · ${Math.round(videoBlob.size / 1024)} KB`
                      : null}
                  </div>
                </div>
              )}
              {audioUrl && (
                <div className="space-y-2">
                  <audio src={audioUrl} controls className="w-full" />
                  <div className="text-xs text-sand-600 dark:text-sand-400">
                    {audioBlob
                      ? `${audioBlob.type || 'audio/webm'} · ${Math.round(audioBlob.size / 1024)} KB`
                      : null}
                  </div>
                </div>
              )}
              {!hasMedia && (
                <p className="text-sm text-sand-600 dark:text-sand-400">
                  No media captured yet. Capture or import media to continue.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {stepIndex === 1 && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card title="What happened?" description="Describe the incident in your own words.">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="What did you witness?"
                value={what}
                onChange={(event) => setWhat(event.target.value)}
                className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-900 shadow-[0_8px_30px_rgba(17,24,39,0.06)] placeholder:text-sand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-400 dark:border-sand-700 dark:bg-sand-900/70 dark:text-sand-100 dark:placeholder:text-sand-500"
              />
              <textarea
                placeholder="Additional notes (optional)"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-900 shadow-[0_8px_30px_rgba(17,24,39,0.06)] placeholder:text-sand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-400 dark:border-sand-700 dark:bg-sand-900/70 dark:text-sand-100 dark:placeholder:text-sand-500"
              />
            </div>
          </Card>

          <Card title="When & where" description="Capture timing and location details.">
            <div className="space-y-4">
              <input
                type="datetime-local"
                value={when}
                onChange={(event) => setWhen(event.target.value)}
                className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-900 shadow-[0_8px_30px_rgba(17,24,39,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-400 dark:border-sand-700 dark:bg-sand-900/70 dark:text-sand-100"
              />
              <p className="text-xs text-sand-600 dark:text-sand-400">
                Auto-filled with the current time. Adjust if needed.
              </p>
              <input
                type="text"
                placeholder="Where did it happen?"
                value={where}
                onChange={(event) => setWhere(event.target.value)}
                className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-900 shadow-[0_8px_30px_rgba(17,24,39,0.06)] placeholder:text-sand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-400 dark:border-sand-700 dark:bg-sand-900/70 dark:text-sand-100 dark:placeholder:text-sand-500"
              />
              <div className="grid gap-3 md:grid-cols-3">
                <input
                  type="text"
                  placeholder="Lat (optional)"
                  value={lat}
                  onChange={(event) => setLat(event.target.value)}
                  className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-900 shadow-[0_8px_30px_rgba(17,24,39,0.06)] placeholder:text-sand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-400 dark:border-sand-700 dark:bg-sand-900/70 dark:text-sand-100 dark:placeholder:text-sand-500"
                />
                <input
                  type="text"
                  placeholder="Lon (optional)"
                  value={lon}
                  onChange={(event) => setLon(event.target.value)}
                  className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-900 shadow-[0_8px_30px_rgba(17,24,39,0.06)] placeholder:text-sand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-400 dark:border-sand-700 dark:bg-sand-900/70 dark:text-sand-100 dark:placeholder:text-sand-500"
                />
              <input
                type="text"
                placeholder="Accuracy (m)"
                value={accuracy}
                onChange={(event) => setAccuracy(event.target.value)}
                className="w-full rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-900 shadow-[0_8px_30px_rgba(17,24,39,0.06)] placeholder:text-sand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sand-400 dark:border-sand-700 dark:bg-sand-900/70 dark:text-sand-100 dark:placeholder:text-sand-500"
              />
            </div>
              <div className="space-y-2 text-xs text-sand-600 dark:text-sand-400">
                <p>Location optional. Capture it if you can, or leave blank.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" onClick={captureLocation}>
                    Capture location
                  </Button>
                  {locationTs && <span>Captured: {locationTs}</span>}
                </div>
                {locationStatus && <p>{locationStatus}</p>}
              </div>
            </div>
          </Card>
        </div>
      )}

      {stepIndex === 2 && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card title="Review" description="Confirm media and metadata before saving.">
            <div className="space-y-4">
              <div className="space-y-3 text-sm text-sand-700 dark:text-sand-300">
                <div>
                  <span className="font-semibold text-sand-900 dark:text-sand-50">What:</span> {what}
                </div>
                <div>
                  <span className="font-semibold text-sand-900 dark:text-sand-50">When:</span> {when}
                </div>
                <div>
                  <span className="font-semibold text-sand-900 dark:text-sand-50">Where:</span> {where}
                </div>
                {notes && (
                  <div>
                    <span className="font-semibold text-sand-900 dark:text-sand-50">Notes:</span>{' '}
                    {notes}
                  </div>
                )}
                {(lat || lon || accuracy) && (
                  <div>
                    <span className="font-semibold text-sand-900 dark:text-sand-50">Location:</span>{' '}
                    {[lat && `lat ${lat}`, lon && `lon ${lon}`, accuracy && `±${accuracy}m`]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-xs text-sand-600 dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-400">
                Vault status: {vaultStatus.toUpperCase()}. Unlock before saving.
              </div>
              {saveMessage && (
                <p className="text-xs text-amber-700 dark:text-amber-200">{saveMessage}</p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSave} disabled={saveDisabled}>
                  Save encrypted
                </Button>
                {lastSavedItemId && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/item/${lastSavedItemId}`)}
                  >
                    View in vault
                  </Button>
                )}
                <Button variant="outline" onClick={goBack}>
                  Back to prompts
                </Button>
              </div>
            </div>
          </Card>

          <Card title="Media preview" description="Captured media ready to encrypt.">
            <div className="space-y-4">
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt="Captured evidence"
                  className="w-full rounded-2xl border border-sand-200 object-cover dark:border-sand-700"
                />
              )}
              {videoUrl && (
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-2xl border border-sand-200 dark:border-sand-700"
                />
              )}
              {audioUrl && <audio src={audioUrl} controls className="w-full" />}
              {!hasMedia && (
                <p className="text-sm text-sand-600 dark:text-sand-400">
                  No media captured yet.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={goBack} disabled={stepIndex === 0}>
          Back
        </Button>
        <Button
          onClick={goNext}
          disabled={
            (stepIndex === 0 && !hasMedia) ||
            (stepIndex === 1 && !promptsComplete) ||
            stepIndex === steps.length - 1
          }
        >
          {stepIndex === 0 ? 'Next: Prompts' : 'Review & Save'}
        </Button>
      </div>
    </div>
  )
}
