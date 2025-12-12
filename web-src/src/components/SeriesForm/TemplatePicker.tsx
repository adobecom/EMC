/* 
* <license header>
*/

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Flex,
  Text,
  Button,
  Heading,
  ActionButton,
  Divider
} from '@adobe/react-spectrum'
import Close from '@spectrum-icons/workflow/Close'
import ZoomIn from '@spectrum-icons/workflow/ZoomIn'
import ZoomOut from '@spectrum-icons/workflow/ZoomOut'
import ChevronRight from '@spectrum-icons/workflow/ChevronRight'
import ChevronLeft from '@spectrum-icons/workflow/ChevronLeft'
import Image from '@spectrum-icons/workflow/Image'
import { COLORS } from '../../styles/designSystem'

/**
 * Placeholder component for templates without images
 */
interface ImagePlaceholderProps {
  width: string | number
  height: string | number
  isSelected?: boolean
}

const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ width, height, isSelected }) => (
  <div
    style={{
      width,
      height,
      backgroundColor: 'var(--spectrum-global-color-gray-200)',
      border: isSelected 
        ? `3px solid ${COLORS.ADOBE_RED}` 
        : '1px solid var(--spectrum-global-color-gray-400)',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '8px'
    }}
  >
    <Image size="XXL" UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-500)' }} />
    <Text UNSAFE_style={{ 
      color: 'var(--spectrum-global-color-gray-600)', 
      fontSize: '11px',
      textAlign: 'center',
      padding: '0 8px'
    }}>
      No preview
    </Text>
  </div>
)

export interface TemplateOption {
  id: string
  name: string
  imageSrc: string
  description?: string
}

interface TemplatePickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: TemplateOption) => void
  templates: TemplateOption[]
  selectedTemplateId?: string
  isLoading?: boolean
}

/**
 * TemplatePicker - Modal overlay for selecting event templates
 * 
 * Features:
 * - Large preview image with zoom in/out controls
 * - Draggable preview for panning
 * - Horizontal carousel of template thumbnails
 * - Selection state with red border indicator
 */
export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  templates,
  selectedTemplateId,
  isLoading = false
}) => {
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(selectedTemplateId || null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [carouselOffset, setCarouselOffset] = useState(0)
  
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviewTemplateId(selectedTemplateId || templates[0]?.id || null)
      resetZoom()
      setCarouselOffset(0)
    }
  }, [isOpen, selectedTemplateId, templates])
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
  // ============================================================================
  // PREVIEW HELPERS
  // ============================================================================
  
  const previewTemplate = templates.find(t => t.id === previewTemplateId)
  
  const resetZoom = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }
  
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3))
  }
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5))
  }
  
  // ============================================================================
  // DRAG HANDLERS
  // ============================================================================
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }, [position])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }, [isDragging, dragStart])
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  // ============================================================================
  // CAROUSEL NAVIGATION
  // ============================================================================
  
  const itemWidth = 180 // Width of each carousel item including gap
  const visibleItems = 5
  const maxOffset = Math.max(0, (templates.length - visibleItems) * itemWidth)
  
  const handleCarouselPrev = () => {
    setCarouselOffset(prev => Math.max(0, prev - itemWidth * 2))
  }
  
  const handleCarouselNext = () => {
    setCarouselOffset(prev => Math.min(maxOffset, prev + itemWidth * 2))
  }
  
  // ============================================================================
  // SELECTION HANDLERS
  // ============================================================================
  
  const handleTemplateClick = (templateId: string) => {
    setPreviewTemplateId(templateId)
    resetZoom()
  }
  
  const handleSave = () => {
    const selected = templates.find(t => t.id === previewTemplateId)
    if (selected) {
      onSelect(selected)
      onClose()
    }
  }
  
  const handleCancel = () => {
    onClose()
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (!isOpen) return null

  return (
    <View
      UNSAFE_style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
    >
      <View
        UNSAFE_style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '85vh',
          padding: '40px 56px',
          backgroundColor: COLORS.WHITE,
          borderRadius: '24px',
          overflow: 'hidden auto',
          margin: '20px'
        }}
      >
        {/* Close Button */}
        <ActionButton
          isQuiet
          onPress={handleCancel}
          UNSAFE_style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10
          }}
          aria-label="Close"
        >
          <Close />
        </ActionButton>
        
        {/* Title */}
        <Heading level={2} UNSAFE_style={{ color: COLORS.ADOBE_RED, marginBottom: '24px' }}>
          Select a template
        </Heading>
        
        {/* Preview Section */}
        <View marginBottom="size-400">
          <Text UNSAFE_style={{ fontWeight: 700, fontSize: '16px', marginBottom: '12px', display: 'block' }}>
            Preview {previewTemplate?.name || ''}
          </Text>
          
          <View
            UNSAFE_style={{
              position: 'relative',
              width: '100%',
              height: '450px',
              backgroundColor: 'var(--spectrum-global-color-gray-100)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          >
            {/* Zoom Controls */}
            <Flex
              direction="column"
              gap="size-50"
              UNSAFE_style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                zIndex: 5
              }}
            >
              <ActionButton
                isQuiet
                onPress={handleZoomIn}
                aria-label="Zoom in"
                UNSAFE_style={{ 
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  borderRadius: '4px'
                }}
              >
                <ZoomIn />
              </ActionButton>
              <ActionButton
                isQuiet
                onPress={handleZoomOut}
                aria-label="Zoom out"
                isDisabled={scale <= 0.5}
                UNSAFE_style={{ 
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  borderRadius: '4px'
                }}
              >
                <ZoomOut />
              </ActionButton>
            </Flex>
            
            {/* Preview Image Container */}
            <div
              ref={previewContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              style={{
                width: '100%',
                height: '100%',
                cursor: isDragging ? 'grabbing' : 'grab',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {previewTemplate ? (
                previewTemplate.imageSrc ? (
                  <img
                    src={previewTemplate.imageSrc}
                    alt={previewTemplate.name}
                    style={{
                      maxWidth: '60%',
                      maxHeight: '90%',
                      objectFit: 'contain',
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}
                    draggable={false}
                  />
                ) : (
                  <ImagePlaceholder width="300px" height="350px" />
                )
              ) : (
                <Text UNSAFE_style={{ color: COLORS.GRAY_600 }}>
                  Select a template to preview
                </Text>
              )}
            </div>
          </View>
        </View>
        
        {/* Template Carousel */}
        <View marginBottom="size-400">
          <Flex direction="row" alignItems="center" gap="size-100">
            {/* Previous Button */}
            <ActionButton
              isQuiet
              onPress={handleCarouselPrev}
              isDisabled={carouselOffset === 0}
              aria-label="Previous templates"
            >
              <ChevronLeft />
            </ActionButton>
            
            {/* Carousel Container */}
            <View
              UNSAFE_style={{
                flex: 1,
                overflow: 'hidden'
              }}
            >
              <div
                ref={carouselRef}
                style={{
                  display: 'flex',
                  gap: '24px',
                  transform: `translateX(-${carouselOffset}px)`,
                  transition: 'transform 0.3s ease'
                }}
              >
                {templates.map((template) => {
                  const isSelected = template.id === previewTemplateId
                  return (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateClick(template.id)}
                      style={{
                        flexShrink: 0,
                        width: '154px',
                        cursor: 'pointer'
                      }}
                    >
                      {template.imageSrc ? (
                        <img
                          src={template.imageSrc}
                          alt={template.name}
                          style={{
                            width: '154px',
                            height: '180px',
                            objectFit: 'cover',
                            objectPosition: 'top left',
                            border: isSelected 
                              ? `3px solid ${COLORS.ADOBE_RED}` 
                              : '1px solid var(--spectrum-global-color-gray-400)',
                            borderRadius: '4px',
                            marginBottom: '8px',
                            transition: 'border 0.15s ease'
                          }}
                          draggable={false}
                        />
                      ) : (
                        <div style={{ marginBottom: '8px' }}>
                          <ImagePlaceholder 
                            width="154px" 
                            height="180px" 
                            isSelected={isSelected} 
                          />
                        </div>
                      )}
                      <Text 
                        UNSAFE_style={{ 
                          fontSize: '14px',
                          fontWeight: isSelected ? 700 : 400,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {template.name}
                      </Text>
                    </div>
                  )
                })}
              </div>
            </View>
            
            {/* Next Button */}
            <ActionButton
              isQuiet
              onPress={handleCarouselNext}
              isDisabled={carouselOffset >= maxOffset}
              aria-label="Next templates"
            >
              <ChevronRight />
            </ActionButton>
          </Flex>
        </View>
        
        {/* Divider */}
        <Divider size="S" marginBottom="size-200" />
        
        {/* Action Buttons */}
        <Flex direction="row" justifyContent="end" gap="size-200">
          <Button
            variant="secondary"
            onPress={handleCancel}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onPress={handleSave}
            isDisabled={!previewTemplateId}
            UNSAFE_style={{
              backgroundColor: previewTemplateId ? COLORS.BLACK : undefined,
              borderColor: previewTemplateId ? COLORS.BLACK : undefined
            }}
          >
            Save
          </Button>
        </Flex>
      </View>
    </View>
  )
}

