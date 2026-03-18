/*
* <license header>
*/

import { useState, useRef, useCallback, useEffect } from 'react'

export type CameraPermission = 'prompt' | 'granted' | 'denied' | 'error'

export interface UseCameraOptions {
  facingMode?: 'user' | 'environment'
  width?: number
  height?: number
}

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  permission: CameraPermission
  isStreaming: boolean
  startCamera: () => Promise<void>
  stopCamera: () => void
  captureFrame: () => { dataUrl: string; blob: Promise<Blob | null> } | null
  error: string | null
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { facingMode = 'user', width = 640, height = 480 } = options

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [permission, setPermission] = useState<CameraPermission>('prompt')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is not supported in this browser')
      setPermission('error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: width }, height: { ideal: height } }
      })

      streamRef.current = stream
      setPermission('granted')

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setIsStreaming(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera'

      if (message.includes('Permission') || message.includes('NotAllowed')) {
        setPermission('denied')
        setError('Camera permission was denied. Please allow camera access and try again.')
      } else {
        setPermission('error')
        setError(message)
      }
    }
  }, [facingMode, width, height])

  const captureFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !isStreaming) return null

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(video, 0, 0)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    const blob = new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    })

    return { dataUrl, blob }
  }, [isStreaming])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [])

  return {
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    canvasRef: canvasRef as React.RefObject<HTMLCanvasElement>,
    permission,
    isStreaming,
    startCamera,
    stopCamera,
    captureFrame,
    error
  }
}
