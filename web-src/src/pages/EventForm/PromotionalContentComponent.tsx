/* 
* <license header>
*/

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  ActionButton,
  ProgressCircle,
} from '@adobe/react-spectrum'
import { Button, Text, Picker, PickerItem } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Remove from '@spectrum-icons/workflow/Remove'
import Add from "@react-spectrum/s2/icons/Add"
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { configService } from '../../services/configService'
import { HeadingWithTooltip } from '../../components/shared'

/**
 * Promotional content item from the config
 * Based on actual API response structure
 */
interface PromotionalContentItem {
  name: string
  thumbnail?: string // URL to the product icon/logo
  'fragment-path'?: string
  cloudType?: string
}

/**
 * Selected promotional item in the form
 */
interface SelectedPromotion {
  id: string
  name: string
}

/**
 * PromotionalContentComponent - Manages promotional content for events
 * 
 * Uses EventFormContext for state management.
 * Loads promotional content options from external config.
 * Allows selecting multiple promotional items to associate with the event.
 */
export const PromotionalContentComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
  } = useEventFormComponent({
    componentId: 'promotional-content',
  })
  
  // Get promotional items from form data (stored as string array)
  const promotionalItems: string[] = formData.promotionalItems?.map(item => 
    typeof item === 'string' ? item : item.title || ''
  ).filter(Boolean) || []
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [availablePromotions, setAvailablePromotions] = useState<PromotionalContentItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // Track selected items with IDs for the UI
  const [selectedItems, setSelectedItems] = useState<SelectedPromotion[]>(() => {
    // Initialize from form data
    return promotionalItems.map((name, index) => ({
      id: `promo-${Date.now()}-${index}`,
      name
    }))
  })
  
  // ============================================================================
  // SYNC FORM DATA WITH LOCAL STATE (only on external changes from API)
  // ============================================================================
  
  // Use ref to track the serialized version for comparison without causing re-renders
  const prevPromotionalItemsRef = useRef<string>(JSON.stringify(promotionalItems))
  const localUpdateRef = useRef(false)
  
  useEffect(() => {
    // If this was a local update (from user interaction), skip sync
    if (localUpdateRef.current) {
      localUpdateRef.current = false
      prevPromotionalItemsRef.current = JSON.stringify(promotionalItems)
      return
    }
    
    // Check if promotionalItems actually changed
    const serializedNew = JSON.stringify(promotionalItems)
    const serializedPrev = prevPromotionalItemsRef.current
    
    if (serializedNew === serializedPrev) {
      return
    }
    
    // This is an external change (API load) - sync it
    setSelectedItems(promotionalItems.map((name, index) => ({
      id: `promo-${Date.now()}-${index}`,
      name
    })))
    
    prevPromotionalItemsRef.current = serializedNew
  }, [promotionalItems])
  
  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  useEffect(() => {
    let isMounted = true
    
    const fetchPromotionalContent = async () => {
      setIsLoading(true)
      setLoadError(null)
      
      try {
        const content = await configService.getPromotionalContent()
        
        if (isMounted) {
          // Filter by cloudType if needed
          const cloudType = formData.cloudType
          const filteredContent = cloudType
            ? content.filter((item: PromotionalContentItem) => 
                !item.cloudType || item.cloudType === cloudType
              )
            : content
          
          setAvailablePromotions(filteredContent)
        }
      } catch (error) {
        console.error('Failed to fetch promotional content:', error)
        if (isMounted) {
          setLoadError('Failed to load promotional content options')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    
    fetchPromotionalContent()
    
    return () => {
      isMounted = false
    }
  }, [formData.cloudType])
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const updateFormPromotionalItems = useCallback((items: SelectedPromotion[]) => {
    // Mark this as a local update to prevent sync effect from running
    localUpdateRef.current = true
    
    // Convert to the format expected by the API (array of strings - promotion names)
    // Per v1 reference: promotionalItems is stored as string[] in the API
    const promotionalItemsPayload = items
      .filter(item => item.name) // Only include items with a selected promotion
      .map(item => item.name) // API expects array of strings
    
    // Store as PromotionalItem objects in form data for type safety
    // The save flow will handle conversion to API format
    updateFormData({ 
      promotionalItems: promotionalItemsPayload.map(name => ({ title: name }))
    })
  }, [updateFormData])
  
  const addPromotionalItem = useCallback(() => {
    const newItem: SelectedPromotion = {
      id: `promo-${Date.now()}`,
      name: ''
    }
    const newItems = [...selectedItems, newItem]
    setSelectedItems(newItems)
    // Don't update form data until a selection is made
  }, [selectedItems])
  
  const removePromotionalItem = useCallback((index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index)
    setSelectedItems(newItems)
    updateFormPromotionalItems(newItems)
  }, [selectedItems, updateFormPromotionalItems])
  
  const handlePromotionSelect = useCallback((index: number, promotionName: string) => {
    const newItems = [...selectedItems]
    newItems[index] = { ...newItems[index], name: promotionName }
    setSelectedItems(newItems)
    updateFormPromotionalItems(newItems)
  }, [selectedItems, updateFormPromotionalItems])
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  /**
   * Get the promotion details by name
   */
  const getPromotionDetails = (name: string): PromotionalContentItem | undefined => {
    return availablePromotions.find(p => p.name === name)
  }
  
  /**
   * Get available promotions (excluding already selected ones, except current)
   */
  const getAvailableOptions = (currentName: string): PromotionalContentItem[] => {
    const selectedNames = selectedItems.map(item => item.name).filter(n => n !== currentName)
    return availablePromotions.filter(p => !selectedNames.includes(p.name))
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
      <div className={style({display: 'flex', alignItems: 'center', gap: 12})}>
        <HeadingWithTooltip 
          level={3}
          tooltip="Select promotional content to feature on your event page. These items help highlight relevant Adobe products and resources."
        >
          Promotional Content
        </HeadingWithTooltip>
        {isLoading && (
          <ProgressCircle size="S" isIndeterminate aria-label="Loading promotional content" />
        )}
      </div>

      {loadError && (
        <View 
          padding="size-200" 
          backgroundColor="negative" 
          borderRadius="medium"
          UNSAFE_style={{ backgroundColor: '#FFE5E5' }}
        >
          <Text UNSAFE_style={{ color: '#C9252D' }}>
            {loadError}
          </Text>
        </View>
      )}
      
      {/* Empty State */}
      {!isLoading && !loadError && selectedItems.length === 0 && (
        <View 
          padding="size-400" 
          backgroundColor="gray-100" 
          borderRadius="medium"
          UNSAFE_style={{ textAlign: 'center' }}
        >
          <div className={style({display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16})}>
            <Text>Add promotional content to feature on your event page</Text>
            <Button
              variant="secondary"
              onPress={addPromotionalItem}
              isDisabled={isLoading || availablePromotions.length === 0}
            >
              <Add />
              <Text>Add promotional item</Text>
            </Button>
          </div>
        </View>
      )}

      {/* Selected Promotional Items */}
      {selectedItems.map((item, index) => {
        const promotionDetails = item.name ? getPromotionDetails(item.name) : undefined
        const availableOptions = getAvailableOptions(item.name)
        
        return (
          <div
            key={item.id}
            className={style({display: 'flex', alignItems: 'center', gap: 16})}
            style={{padding: '12px 0'}}
          >
            {/* Promotion Icon/Image */}
            <View
              UNSAFE_style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                backgroundColor: promotionDetails?.thumbnail 
                  ? 'transparent' 
                  : '#E1E1E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {promotionDetails?.thumbnail && (
                <img 
                  src={promotionDetails.thumbnail} 
                  alt={promotionDetails.name}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain' 
                  }}
                />
              )}
            </View>
            
            {/* Promotion Picker */}
            <Picker
              aria-label="Select a promotion"
              placeholder="Select a promotion"
              selectedKey={item.name || null}
              onSelectionChange={(key) => handlePromotionSelect(index, key as string)}
              styles={style({ width: 240 })}
              isDisabled={isLoading}
            >
              {availableOptions.map(promo => (
                <PickerItem key={promo.name} id={promo.name}>{promo.name}</PickerItem>
              ))}
            </Picker>
            
            {/* Remove Button */}
            <ActionButton 
              onPress={() => removePromotionalItem(index)} 
              isQuiet 
              aria-label="Remove promotional item"
              UNSAFE_style={{
                borderRadius: '50%',
                minWidth: '32px',
                width: '32px',
                height: '32px',
                padding: 0,
              }}
            >
              <Remove size="S" />
            </ActionButton>
          </div>
        )
      })}

      {/* Add Promotional Item Button - only show when items exist */}
      {selectedItems.length > 0 && (
        <Button
          variant="secondary"
          onPress={addPromotionalItem}
          isDisabled={isLoading || availablePromotions.length === 0}
          styles={style({ width: '[100%]' })}
          UNSAFE_style={{
            backgroundColor: 'var(--spectrum-gray-200)',
            border: 'none',
            color: 'var(--spectrum-gray-800)',
          }}
        >
          <Add />
          <Text>Add promotional item</Text>
        </Button>
      )}
    </div>
  )
}

