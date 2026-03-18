/*
* <license header>
*/

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { View, Flex, Button, Text } from '@adobe/react-spectrum'
import Camera from '@spectrum-icons/workflow/Camera'
import Refresh from '@spectrum-icons/workflow/Refresh'
import Checkmark from '@spectrum-icons/workflow/Checkmark'
import Close from '@spectrum-icons/workflow/Close'
import Alert from '@spectrum-icons/workflow/Alert'
import { useCamera } from '../../hooks/useCamera'
import { useFaceDetection } from '../../hooks/useFaceDetection'
import type { UseCameraOptions } from '../../hooks/useCamera'
import type { FaceBox } from '../../hooks/useFaceDetection'
import { COLORS, BORDERS } from '../../styles/designSystem'

interface CameraCaptureProps {
  onCapture: (dataUrl: string, blob: Promise<Blob | null>) => void
  onCancel?: () => void
  onError?: (error: string) => void
  facingMode?: UseCameraOptions['facingMode']
  width?: number
  height?: number
  enableFaceDetection?: boolean
  requireFaceForCapture?: boolean
}

/**
 * Maps face-api.js detection coordinates (in natural video resolution)
 * to the displayed element dimensions, accounting for object-fit: cover.
 */
function scaleBoxToDisplay(
  box: FaceBox,
  video: HTMLVideoElement,
  displayWidth: number,
  displayHeight: number,
  mirrored: boolean
): React.CSSProperties {
  const videoW = video.videoWidth
  const videoH = video.videoHeight
  if (!videoW || !videoH) return { display: 'none' }

  const videoAspect = videoW / videoH
  const displayAspect = displayWidth / displayHeight

  let scale: number
  let offsetX = 0
  let offsetY = 0

  if (videoAspect > displayAspect) {
    // Video is wider — cropped horizontally
    scale = displayHeight / videoH
    offsetX = (displayWidth - videoW * scale) / 2
  } else {
    // Video is taller — cropped vertically
    scale = displayWidth / videoW
    offsetY = (displayHeight - videoH * scale) / 2
  }

  let left = box.x * scale + offsetX
  const top = box.y * scale + offsetY
  const width = box.width * scale
  const height = box.height * scale

  if (mirrored) {
    left = displayWidth - left - width
  }

  return {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`
  }
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
  onError,
  facingMode = 'user',
  width = 480,
  height = 360,
  enableFaceDetection = false,
  requireFaceForCapture = false
}) => {
  const {
    videoRef,
    canvasRef,
    permission,
    isStreaming,
    startCamera,
    stopCamera,
    captureFrame,
    error
  } = useCamera({ facingMode, width, height })

  const { faceDetected, faceBox, isModelLoaded, modelError } = useFaceDetection({
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    enabled: enableFaceDetection,
    isStreaming
  })

  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Promise<Blob | null> | null>(null)

  // Start camera on mount
  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Report errors
  useEffect(() => {
    if (error && onError) {
      onError(error)
    }
  }, [error, onError])

  const handleCapture = useCallback(() => {
    const result = captureFrame()
    if (result) {
      setCapturedImage(result.dataUrl)
      setCapturedBlob(result.blob)
      stopCamera()
    }
  }, [captureFrame, stopCamera])

  const handleRetake = useCallback(() => {
    setCapturedImage(null)
    setCapturedBlob(null)
    startCamera()
  }, [startCamera])

  const handleUsePhoto = useCallback(() => {
    if (capturedImage && capturedBlob) {
      onCapture(capturedImage, capturedBlob)
    }
  }, [capturedImage, capturedBlob, onCapture])

  const isMirrored = facingMode === 'user'
  const showFaceDetection = enableFaceDetection && isStreaming && !capturedImage

  const faceBoxStyle = useMemo(() => {
    if (!faceBox || !faceDetected || !showFaceDetection) return null
    const video = (videoRef as React.RefObject<HTMLVideoElement>).current
    if (!video) return null
    return scaleBoxToDisplay(faceBox, video, width, height, isMirrored)
  }, [faceBox, faceDetected, showFaceDetection, videoRef, width, height, isMirrored])

  const captureDisabled = !isStreaming || (requireFaceForCapture && enableFaceDetection && !faceDetected)

  // Permission denied state
  if (permission === 'denied' || permission === 'error') {
    return (
      <View
        borderRadius="medium"
        padding="size-400"
        UNSAFE_style={{
          ...BORDERS.DOTTED_GRAY,
          width: `${width}px`,
          height: `${height}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.GRAY_100
        }}
      >
        <Alert size="XL" UNSAFE_style={{ color: COLORS.GRAY_600, marginBottom: 16 }} />
        <Text UNSAFE_style={{ color: COLORS.GRAY_700, textAlign: 'center', marginBottom: 16 }}>
          {error || 'Camera access is required for biometric capture.'}
        </Text>
        <Flex gap="size-100">
          <Button variant="secondary" onPress={() => startCamera()}>
            Try Again
          </Button>
          {onCancel && (
            <Button variant="secondary" onPress={onCancel}>
              Cancel
            </Button>
          )}
        </Flex>
      </View>
    )
  }

  return (
    <Flex direction="column" gap="size-200" alignItems="center">
      {/* Video / Captured Image Display */}
      <View
        borderRadius="medium"
        UNSAFE_style={{
          width: `${width}px`,
          height: `${height}px`,
          overflow: 'hidden',
          border: `2px solid ${isStreaming || capturedImage ? COLORS.GRAY_300 : COLORS.GRAY_200}`,
          backgroundColor: COLORS.BLACK,
          position: 'relative'
        }}
      >
        {/* Live video feed */}
        <video
          ref={videoRef as React.RefObject<HTMLVideoElement>}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: capturedImage ? 'none' : 'block',
            transform: isMirrored ? 'scaleX(-1)' : 'none'
          }}
          playsInline
          muted
        />

        {/* Captured still image */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured face"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: isMirrored ? 'scaleX(-1)' : 'none'
            }}
          />
        )}

        {/* Face bounding box overlay */}
        {showFaceDetection && faceDetected && faceBoxStyle && (
          <div style={{
            ...faceBoxStyle,
            border: '2px solid #00C853',
            borderRadius: '4px',
            boxShadow: '0 0 8px rgba(0, 200, 83, 0.4)',
            pointerEvents: 'none',
            transition: 'all 150ms ease-out'
          }} />
        )}

        {/* Face guide oval — shown when no face detected or detection not active */}
        {isStreaming && !capturedImage && !(enableFaceDetection && faceDetected) && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '200px',
            height: '260px',
            border: `2px dashed rgba(255, 255, 255, ${enableFaceDetection && isModelLoaded ? '0.3' : '0.5'})`,
            borderRadius: '50%',
            pointerEvents: 'none'
          }} />
        )}
      </View>

      {/* Face detection status indicator */}
      {showFaceDetection && (
        <Flex alignItems="center" gap="size-100" UNSAFE_style={{ height: '20px' }}>
          {!isModelLoaded && !modelError && (
            <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '13px' }}>
              Loading face detection...
            </Text>
          )}
          {modelError && (
            <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '13px' }}>
              {modelError}
            </Text>
          )}
          {isModelLoaded && !modelError && faceDetected && (
            <>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#00C853'
              }} />
              <Text UNSAFE_style={{ color: '#00C853', fontSize: '13px', fontWeight: 600 }}>
                Face detected
              </Text>
            </>
          )}
          {isModelLoaded && !modelError && !faceDetected && (
            <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontSize: '13px' }}>
              Position your face in the frame
            </Text>
          )}
        </Flex>
      )}

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} style={{ display: 'none' }} />

      {/* Action Buttons */}
      <Flex gap="size-100" justifyContent="center">
        {!capturedImage ? (
          <>
            <Button
              variant="cta"
              onPress={handleCapture}
              isDisabled={captureDisabled}
            >
              <Camera />
              <Text>Capture</Text>
            </Button>
            {onCancel && (
              <Button variant="secondary" onPress={onCancel}>
                <Close />
                <Text>Cancel</Text>
              </Button>
            )}
          </>
        ) : (
          <>
            <Button variant="secondary" onPress={handleRetake}>
              <Refresh />
              <Text>Retake</Text>
            </Button>
            <Button variant="cta" onPress={handleUsePhoto}>
              <Checkmark />
              <Text>Use Photo</Text>
            </Button>
          </>
        )}
      </Flex>
    </Flex>
  )
}
