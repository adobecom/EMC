/* 
* <license header>
*/

import React, { useState, useRef } from 'react'
import {
  View,
  Flex,
  Text,
  ProgressCircle,
  ActionButton,
  AlertDialog,
  DialogTrigger
} from '@adobe/react-spectrum'
import Delete from '@spectrum-icons/workflow/Delete'
import ImageAdd from '@spectrum-icons/workflow/ImageAdd'
import { uploadImage, UploadTracker } from '../../services/requestHelpers'
import { tokenStorage } from '../../services/tokenStorage'
import { getCurrentEnvironment, getApiHost } from '../../config/environmentConfig'
import { apiService } from '../../services/api'
import { IMAGE_UPLOAD, type ValidImageType } from '../../config/uiConstants'

// ============================================================================
// IMAGE VALIDATION UTILITIES
// ============================================================================

/** Allowed image types for upload */
/**
 * Validate image type by checking file signature (magic bytes)
 * This prevents spoofed file extensions from bypassing validation
 */
async function isImageTypeValid(file: File): Promise<{ valid: boolean; detectedType: string | null }> {
  const blob = file.slice(0, 128)
  const arrayBuffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  
  let detectedType: string | null = null

  // Magic byte signatures for image formats
  const signatures = {
    jpeg: [0xFF, 0xD8, 0xFF],
    png: [0x89, 0x50, 0x4E, 0x47]
  }

  // Check for JPEG signature
  if (signatures.jpeg.every((byte, i) => byte === bytes[i])) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension === 'jpg' || extension === 'jpeg') {
      detectedType = extension
    } else {
      detectedType = 'jpg'
    }
  }

  // Check for PNG signature
  if (signatures.png.every((byte, i) => byte === bytes[i])) {
    detectedType = 'png'
  }

  // Check for SVG (text-based, starts with <svg)
  if (!detectedType) {
    const text = await blob.text()
    if (text.trim().startsWith('<svg') || text.trim().startsWith('<?xml')) {
      // For XML declaration, check if it contains SVG
      if (text.trim().startsWith('<?xml')) {
        const fullText = await file.text()
        if (fullText.includes('<svg')) {
          detectedType = 'svg'
        }
      } else {
        detectedType = 'svg'
      }
    }
  }

  const valid = detectedType !== null && IMAGE_UPLOAD.validTypes.includes(detectedType as ValidImageType)
  return { valid, detectedType }
}

/**
 * Validate image file size
 */
function isImageSizeValid(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes
}

// ============================================================================
// COMPONENT INTERFACE
// ============================================================================

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate preview URL for pending file
  React.useEffect(() => {
    if (pendingFile) {
      const url = URL.createObjectURL(pendingFile)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
    return undefined
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
    setError(null)
    
    // Validate file size first (quick check)
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (!isImageSizeValid(file, maxSizeBytes)) {
      setError(`File size exceeds ${maxSizeMB}MB limit`)
      return
    }

    // Validate image type using magic byte signature checking
    // This prevents spoofed file extensions from bypassing validation
    const { valid, detectedType } = await isImageTypeValid(file)
    
    if (!valid) {
      const allowedTypesStr = IMAGE_UPLOAD.validTypes.join(', ').toUpperCase()
      if (detectedType) {
        setError(`Invalid image type: ${detectedType.toUpperCase()}. Allowed types: ${allowedTypesStr}`)
      } else {
        setError(`Please upload a valid image file. Allowed types: ${allowedTypesStr}`)
      }
      return
    }

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

  const handleRemoveClick = () => {
    // For pending files (not yet uploaded), just remove without dialog
    if (pendingFile && !imageUrl) {
      if (onRemove) {
        onRemove()
      }
      setError(null)
      return
    }
    // For uploaded images, show confirmation dialog
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    // If we have an uploaded image with an ID, make the DELETE API call
    if (imageId && eventId) {
      setIsDeleting(true)
      setError(null)
      
      try {
        // Note: targetUrl should be relative path - callExternalApi adds the host
        const config = {
          targetUrl: `/v1/events/${eventId}/images`,
          type: imageKind
        }
        
        const result = await apiService.deleteImage(config, imageId)
        
        if ('error' in result) {
          console.error('Failed to delete image:', result.error)
          setError(result.error || 'Failed to delete image')
          setIsDeleting(false)
          return
        }
        
        // Success - call onRemove to update local state
        if (onRemove) {
          onRemove()
        }
      } catch (err) {
        console.error('Delete image error:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete image')
      } finally {
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
      }
    } else {
      // No imageId or eventId - just remove from local state
      if (onRemove) {
        onRemove()
      }
      setIsDeleteDialogOpen(false)
    }
    setError(null)
  }

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false)
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
              onPress={handleRemoveClick} 
              isQuiet
              aria-label="Remove image"
              isDisabled={isDeleting}
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
          {isDeleting && (
            <View
              UNSAFE_style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ProgressCircle aria-label="Deleting image" isIndeterminate size="M" />
            </View>
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
                  Supported formats: <strong>JPG, PNG, SVG</strong>
                </Text>
                <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-500)' }}>
                  Max size: <strong>{maxSizeMB}</strong> MB
                </Text>
              </Flex>
            </Flex>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_UPLOAD.acceptedFileTypes}
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

      {/* Delete Confirmation Dialog */}
      <DialogTrigger
        isOpen={isDeleteDialogOpen}
        onOpenChange={(isOpen) => !isOpen && handleDeleteCancel()}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="You are deleting this image."
          variant="destructive"
          primaryActionLabel="Yes, I want to delete this image"
          cancelLabel="Do not delete"
          onPrimaryAction={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isPrimaryActionDisabled={isDeleting}
        >
          Are you sure you want to do this? This cannot be undone.
        </AlertDialog>
      </DialogTrigger>
    </View>
  )
}

