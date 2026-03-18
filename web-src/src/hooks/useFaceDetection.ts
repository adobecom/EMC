/*
* <license header>
*/

import { useState, useEffect, useRef } from 'react'
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
const MODEL_CDN = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'

let detector: FaceDetector | null = null
let detectorLoading = false
let detectorLoadPromise: Promise<FaceDetector> | null = null

export interface FaceBox {
  x: number
  y: number
  width: number
  height: number
}

export interface UseFaceDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  enabled: boolean
  isStreaming: boolean
  intervalMs?: number
}

export interface UseFaceDetectionReturn {
  faceDetected: boolean
  faceBox: FaceBox | null
  isModelLoaded: boolean
  modelError: string | null
}

async function loadDetector(): Promise<FaceDetector> {
  if (detector) return detector
  if (detectorLoading && detectorLoadPromise) return detectorLoadPromise

  detectorLoading = true
  detectorLoadPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(WASM_CDN)
    const fd = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_CDN,
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      minDetectionConfidence: 0.5
    })
    detector = fd
    detectorLoading = false
    return fd
  })()

  return detectorLoadPromise
}

export function useFaceDetection(options: UseFaceDetectionOptions): UseFaceDetectionReturn {
  const { videoRef, enabled, isStreaming, intervalMs = 250 } = options

  const [faceDetected, setFaceDetected] = useState(false)
  const [faceBox, setFaceBox] = useState<FaceBox | null>(null)
  const [isModelLoaded, setIsModelLoaded] = useState(!!detector)
  const [modelError, setModelError] = useState<string | null>(null)

  const isStreamingRef = useRef(isStreaming)
  isStreamingRef.current = isStreaming

  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  // Load detector when enabled
  useEffect(() => {
    if (!enabled) return

    if (detector) {
      setIsModelLoaded(true)
      return
    }

    loadDetector()
      .then(() => setIsModelLoaded(true))
      .catch((err) => {
        console.error('Failed to load face detection model:', err)
        setModelError('Failed to load face detection model')
      })
  }, [enabled])

  // Reset state when disabled or not streaming
  useEffect(() => {
    if (!enabled || !isStreaming) {
      setFaceDetected(false)
      setFaceBox(null)
    }
  }, [enabled, isStreaming])

  // Detection loop
  useEffect(() => {
    if (!enabled || !isStreaming || !isModelLoaded || !detector) return

    const detect = () => {
      if (!isStreamingRef.current || !enabledRef.current) return
      const video = videoRef.current
      if (!video || video.readyState < 2 || !detector) return

      try {
        const result = detector.detectForVideo(video, performance.now())
        if (!isStreamingRef.current || !enabledRef.current) return

        if (result.detections.length > 0) {
          const bb = result.detections[0].boundingBox
          if (bb) {
            setFaceDetected(true)
            setFaceBox({
              x: bb.originX,
              y: bb.originY,
              width: bb.width,
              height: bb.height
            })
          }
        } else {
          setFaceDetected(false)
          setFaceBox(null)
        }
      } catch {
        // Silently ignore detection errors (e.g. video not ready)
      }
    }

    const intervalId = setInterval(detect, intervalMs)
    detect()

    return () => clearInterval(intervalId)
  }, [enabled, isStreaming, isModelLoaded, intervalMs, videoRef])

  return { faceDetected, faceBox, isModelLoaded, modelError }
}
