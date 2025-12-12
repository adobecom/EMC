/* 
* <license header>
*/

import React, { useState, useRef } from 'react'
import {
  View,
  Flex,
  Text,
  ProgressCircle,
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
  width?: string | number
  isDisabled?: boolean
  onChange: (imageUrl: string, imageId: string) => void
  onRemove?: () => void
  /** Custom dropzone text - line 1 (e.g., "Add profile image") */
  dropzoneTitle?: string
  /** Custom dropzone text - line 2 (e.g., "Dimensions 584 x 300 px") */
  dropzoneDimensions?: string
  /** 
   * If true, doesn't upload immediately. Instead stores file and calls onFileSelected.
   * Use uploadPendingFile() to upload later.
   */
  deferUpload?: boolean
  /** Called when a file is selected in deferred mode */
  onFileSelected?: (file: File) => void
  /** The pending file to show preview for (in deferred mode) */
  pendingFile?: File
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
  width,
  isDisabled = false,
  onChange,
  onRemove,
  dropzoneTitle,
  dropzoneDimensions,
  deferUpload = false,
  onFileSelected,
  pendingFile
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate preview URL for pending file
  React.useEffect(() => {
    if (pendingFile) {
      const url = URL.createObjectURL(pendingFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setPreviewUrl(null)
    }
  }, [pendingFile])

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

    // In deferred mode, just store the file and notify parent
    if (deferUpload) {
      if (onFileSelected) {
        onFileSelected(file)
      }
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Immediate upload mode
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

  const containerWidth = width ?? '100%'

  return (
    <View UNSAFE_style={{ width: typeof containerWidth === 'number' ? `${containerWidth}px` : containerWidth }}>
      <Text UNSAFE_style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
        {label}
      </Text>
      
      {description && (
        <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-700)', marginBottom: '8px', display: 'block' }}>
          {description}
        </Text>
      )}

      {imageUrl || previewUrl ? (
        // Show uploaded image or pending file preview
        <View
          borderWidth="thin"
          borderColor="default"
          borderRadius="medium"
          UNSAFE_style={{ position: 'relative', overflow: 'hidden' }}
        >
          <img 
            src={imageUrl || previewUrl || ''} 
            alt={altText || label}
            style={{ 
              width: '100%', 
              height: 'auto',
              display: 'block'
            }}
          />
          {previewUrl && !imageUrl && (
            <View
              UNSAFE_style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(255, 193, 7, 0.9)',
                padding: '4px 8px',
                textAlign: 'center'
              }}
            >
              <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 'bold' }}>
                Pending upload - save to upload
              </Text>
            </View>
          )}
          {!isDisabled && (
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
          )}
        </View>
      ) : (
        // Show dropzone - entire area is clickable and droppable
        <div
          onDragOver={isDisabled ? undefined : handleDragOver}
          onDragLeave={isDisabled ? undefined : handleDragLeave}
          onDrop={isDisabled ? undefined : handleDrop}
          onClick={isUploading || isDisabled ? undefined : handleBrowseClick}
          style={{
            border: isDragging 
              ? '2px dashed var(--spectrum-global-color-blue-600)' 
              : '2px dotted var(--spectrum-global-color-gray-500)',
            backgroundColor: isDragging 
              ? 'var(--spectrum-global-color-blue-100)' 
              : 'transparent',
            cursor: isUploading || isDisabled ? 'default' : 'pointer',
            opacity: isDisabled ? 0.5 : 1,
            transition: 'all 0.2s ease',
            borderRadius: '4px',
            padding: '32px'
          }}
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
            <Flex direction="column" alignItems="center" gap="size-150">
              <ImageAdd size="XXL" UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }} />
              <Text UNSAFE_style={{ fontSize: '14px', color: 'var(--spectrum-global-color-gray-700)' }}>
                {dropzoneTitle || 'Drop image here or click to browse'}
              </Text>
              <Flex direction="column" alignItems="center" gap="size-50">
                {(dropzoneDimensions || recommendedDimensions) && (
                  <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-500)' }}>
                    {dropzoneDimensions || recommendedDimensions}
                  </Text>
                )}
                <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-500)' }}>
                  Does not exceed <strong>{maxSizeMB}</strong> MB
                </Text>
              </Flex>
            </Flex>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {error && (
        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-red-600)', marginTop: '8px', display: 'block' }}>
          {error}
        </Text>
      )}
    </View>
  )
}

