/* 
* <license header>
*/

import React, { useState, useRef } from 'react'
import {
  View,
  Flex,
  Text,
  ProgressCircle,
  Button,
  ActionButton
} from '@adobe/react-spectrum'
import Delete from '@spectrum-icons/workflow/Delete'
import ImageAdd from '@spectrum-icons/workflow/ImageAdd'
import { uploadImage, UploadTracker } from '../../services/requestHelpers'
import { tokenStorage } from '../../services/tokenStorage'
import { getCurrentEnvironment, getApiHost } from '../../config/constants'

interface ImageUploaderProps {
  label: string
  imageUrl?: string
  imageId?: string
  imageKind: string
  altText?: string
  eventId?: string
  description?: string
  maxSizeMB?: number
  recommendedDimensions?: string
  onChange: (imageUrl: string, imageId: string) => void
  onRemove?: () => void
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  imageUrl,
  imageId,
  imageKind,
  altText = '',
  eventId,
  description,
  maxSizeMB = 25,
  recommendedDimensions,
  onChange,
  onRemove
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPEG, etc.)')
      return
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
      setError(`File size exceeds ${maxSizeMB}MB limit`)
      return
    }

    setError(null)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const token = tokenStorage.getValidToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const env = getCurrentEnvironment()
      const host = getApiHost('esp', env)
      const uploadUrl = eventId 
        ? `${host}/v1/events/${eventId}/images`
        : `${host}/v1/images`

      const tracker: UploadTracker = { progress: 0 }
      
      // Update progress in real-time
      const progressInterval = setInterval(() => {
        setUploadProgress(tracker.progress)
      }, 100)

      const config = {
        targetUrl: uploadUrl,
        altText: altText,
        type: imageKind
      }

      const result = await uploadImage(file, config, token, tracker, imageId)
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      // Call onChange with the uploaded image URL and ID
      if (result.imageUrl && result.imageId) {
        onChange(result.imageUrl, result.imageId)
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove()
    }
    setError(null)
  }

  return (
    <View width="100%">
      <Text UNSAFE_style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
        {label}
      </Text>
      
      {description && (
        <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-700)', marginBottom: '8px', display: 'block' }}>
          {description}
        </Text>
      )}

      {imageUrl ? (
        // Show uploaded image
        <View
          borderWidth="thin"
          borderColor="default"
          borderRadius="medium"
          UNSAFE_style={{ position: 'relative', overflow: 'hidden' }}
        >
          <img 
            src={imageUrl} 
            alt={altText || label}
            style={{ 
              width: '100%', 
              maxHeight: '300px', 
              display: 'block',
              objectFit: 'cover'
            }}
          />
          <ActionButton 
            onPress={handleRemove} 
            isQuiet
            aria-label="Remove image"
            UNSAFE_style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '4px'
            }}
          >
            <Delete />
          </ActionButton>
        </View>
      ) : (
        // Show dropzone
        <View
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          borderRadius="medium"
          padding="size-400"
          UNSAFE_style={{
            border: isDragging 
              ? '2px dashed var(--spectrum-global-color-blue-600)' 
              : '2px dotted var(--spectrum-global-color-gray-500)',
            backgroundColor: isDragging 
              ? 'var(--spectrum-global-color-blue-100)' 
              : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          UNSAFE_className="image-dropzone"
        >
          {isUploading ? (
            <Flex direction="column" alignItems="center" gap="size-200">
              <ProgressCircle 
                aria-label="Uploading image" 
                value={uploadProgress}
                size="L"
              />
              <Text>Uploading... {Math.round(uploadProgress)}%</Text>
            </Flex>
          ) : (
            <Flex direction="column" alignItems="center" gap="size-200">
              <ImageAdd size="XXL" UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-700)' }} />
              <Text UNSAFE_style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--spectrum-global-color-gray-700)' }}>
                Drag and drop an image here
              </Text>
              <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-700)' }}>
                or
              </Text>
              <Button variant="secondary" onPress={handleBrowseClick}>
                Browse Files
              </Button>
              {recommendedDimensions && (
                <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                  Recommended: {recommendedDimensions}
                </Text>
              )}
              <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                Maximum file size: {maxSizeMB}MB
              </Text>
            </Flex>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </View>
      )}

      {error && (
        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-red-600)', marginTop: '8px', display: 'block' }}>
          {error}
        </Text>
      )}
    </View>
  )
}

