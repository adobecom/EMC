/* 
* <license header>
*/

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Checkbox,
  Flex,
  Heading,
  Text,
  TextField
} from '@adobe/react-spectrum'
import { RichTextEditor, ImageUploader } from '../../components/shared'
import { TYPOGRAPHY } from '../../styles/designSystem'
import { VenueData, EventApiResponse } from '../../types/domain'
import { loadGooglePlacesAPI } from '../../utils/loadGooglePlaces'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { apiService } from '../../services/api'
import { getVenuePayload } from '../../utils/dataFilters'
import '../../../src/types/google-places.d.ts'

/**
 * VenueComponent - Manages venue information for in-person events
 * 
 * Lifecycle Integration:
 * - Uses useEventFormComponent hook for context integration
 * - onAfterSave: Creates or replaces venue via API after event is saved
 * - Handles Google Places autocomplete for venue search
 * - Venue image handled by ImageUploader (uploads independently)
 */
export const VenueComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
    eventId,
    locale,
  } = useEventFormComponent({
    componentId: 'venue',
    
    /**
     * After the main event save, create or update the venue
     * This runs in parallel with other component onAfterSave callbacks
     */
    onAfterSave: async (savedEventId: string, eventResponse: EventApiResponse) => {
      const venueData = formData.venue
      
      // Skip if no venue name entered
      if (!venueData?.venueName?.trim()) {
        return
      }
      
      // Build the localized venue payload
      // Required fields per OpenAPI: placeId, venueName, formattedAddress, addressComponents, coordinates, gmtOffset
      const venuePayload = getVenuePayload({
        venueName: venueData.venueName,
        placeId: venueData.placeId,
        coordinates: venueData.coordinates,
        gmtOffset: venueData.gmtOffset,
        formattedAddress: venueData.formattedAddress,
        addressComponents: venueData.addressComponents, // Required by OpenAPI
        additionalInformation: venueData.additionalInformation,
      }, locale)
      
      // Check if venue already exists on the event
      const existingVenue = eventResponse.venue
      
      try {
        if (!existingVenue) {
          // Create new venue
          const result = await apiService.createVenue(savedEventId, venuePayload)
          
          if ('error' in result) {
            console.error('Failed to create venue:', result)
            // Don't throw - let other components continue
            return
          }
          
          console.log('Venue created successfully:', result)
        } else {
          // Check if venue data has changed
          const hasPlaceIdChanged = venuePayload.placeId !== existingVenue.placeId
          const hasAdditionalInfoChanged = venueData.additionalInformation !== existingVenue.additionalInformation
          
          if (hasPlaceIdChanged || hasAdditionalInfoChanged) {
            // Replace existing venue
            const result = await apiService.replaceVenue(
              savedEventId,
              existingVenue.venueId,
              {
                ...venuePayload,
                venueId: existingVenue.venueId,
                creationTime: existingVenue.creationTime,
                modificationTime: existingVenue.modificationTime,
              }
            )
            
            if ('error' in result) {
              console.error('Failed to replace venue:', result)
              return
            }
            
            console.log('Venue replaced successfully:', result)
          }
        }
      } catch (error) {
        console.error('Error saving venue:', error)
        // Don't throw - let save complete for other components
      }
    },
    
    /**
     * Validate venue data before save
     */
    validate: () => {
      const venueData = formData.venue
      
      // If venue name is provided, placeId should also be present (from autocomplete)
      if (venueData?.venueName?.trim() && !venueData?.placeId) {
        return 'Please select a valid venue from the autocomplete suggestions'
      }
      
      return true
    }
  })
  
  // Get venue data from form context
  const venue = formData.venue || {
    venueName: '',
    formattedAddress: '',
    additionalInformation: '',
    showVenuePostEvent: false,
    showAdditionalInfoPostEvent: false
  }
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const venueNameInputRef = useRef<HTMLInputElement>(null)
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)
  const [venueNameValue, setVenueNameValue] = useState(venue.venueName || '')
  const [placesApiError, setPlacesApiError] = useState<string | null>(null)
  const [placesApiLoaded, setPlacesApiLoaded] = useState(false)
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  /**
   * Update venue data in context
   */
  const updateVenue = useCallback((updates: Partial<VenueData>) => {
    updateFormData({
      venue: { ...venue, ...updates }
    })
  }, [venue, updateFormData])
  
  // ============================================================================
  // GOOGLE PLACES AUTOCOMPLETE
  // ============================================================================
  
  useEffect(() => {
    let isMounted = true
    let autocompleteInstance: google.maps.places.Autocomplete | null = null

    const initAutocomplete = async () => {
      try {
        await loadGooglePlacesAPI()
        if (!isMounted) return
        
        setPlacesApiLoaded(true)

        if (venueNameInputRef.current && !autocomplete) {
          autocompleteInstance = new window.google.maps.places.Autocomplete(
            venueNameInputRef.current,
            {
              types: ['establishment'],
              fields: ['place_id', 'name', 'formatted_address', 'address_components', 'geometry', 'utc_offset_minutes']
            }
          )

          autocompleteInstance.addListener('place_changed', () => {
            if (!isMounted) return
            
            const place = autocompleteInstance?.getPlace()
            
            if (!place || place.name === undefined) {
              if (window.google?.maps?.places) {
                console.warn('Google Places API error - possibly domain restriction')
                setPlacesApiError('Autocomplete unavailable. Please enter venue details manually.')
              }
              return
            }
            
            if (place && place.place_id) {
              setPlacesApiError(null)
              
              const updates: Partial<VenueData> = {
                venueName: place.name || '',
                formattedAddress: place.formatted_address || '',
                placeId: place.place_id
              }

              if (place.geometry && place.geometry.location) {
                updates.coordinates = {
                  lat: place.geometry.location.lat(),
                  lon: place.geometry.location.lng()
                }
              }

              if (place.utc_offset_minutes !== undefined) {
                // Per OpenAPI: gmtOffset is in hours, Google Places returns minutes
                updates.gmtOffset = place.utc_offset_minutes / 60
              }
              
              // Required by OpenAPI: addressComponents from Google Places API
              // Per OpenAPI AddressComponent schema: uses camelCase (longName, shortName, types)
              if (place.address_components) {
                updates.addressComponents = place.address_components.map((component: any) => ({
                  longName: component.long_name,
                  shortName: component.short_name,
                  types: component.types
                }))
              }

              setVenueNameValue(place.name || '')
              updateVenue(updates)
            }
          })

          if (isMounted) {
            setAutocomplete(autocompleteInstance)
          }
        }
      } catch (error) {
        if (!isMounted) return
        
        console.error('Error initializing Google Places Autocomplete:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to load Google Places API'
        setPlacesApiError(errorMessage)
        setPlacesApiLoaded(false)
      }
    }

    initAutocomplete()

    return () => {
      isMounted = false
      if (autocompleteInstance) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteInstance)
      }
    }
  }, [autocomplete, updateVenue])
  
  // Sync local state with context when venue changes externally
  useEffect(() => {
    if (venue.venueName !== venueNameValue) {
      setVenueNameValue(venue.venueName || '')
    }
  }, [venue.venueName])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleVenueNameChange = (value: string) => {
    setVenueNameValue(value)
    updateVenue({ venueName: value })
  }
  
  const handleAddressChange = (value: string) => {
    updateVenue({ formattedAddress: value })
  }
  
  const handleAdditionalInfoChange = (value: string) => {
    updateVenue({ additionalInformation: value })
  }
  
  const handleShowVenuePostEventChange = (checked: boolean) => {
    updateVenue({ showVenuePostEvent: checked })
    // If unchecking venue visibility, also uncheck additional info
    if (!checked && venue.showAdditionalInfoPostEvent) {
      updateVenue({ 
        showVenuePostEvent: false,
        showAdditionalInfoPostEvent: false 
      })
    }
  }
  
  const handleShowAdditionalInfoPostEventChange = (checked: boolean) => {
    updateVenue({ showAdditionalInfoPostEvent: checked })
    // If checking additional info, also check venue visibility
    if (checked && !venue.showVenuePostEvent) {
      updateVenue({
        showVenuePostEvent: true,
        showAdditionalInfoPostEvent: true
      })
    }
  }
  
  const handleImageChange = (imageUrl: string | undefined, imageId: string | undefined) => {
    updateVenue({ 
      venueImageUrl: imageUrl, 
      venueImageId: imageId 
    })
  }
  
  const handleImageRemove = () => {
    updateVenue({ 
      venueImageUrl: undefined, 
      venueImageId: undefined 
    })
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap="size-200">
      <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Venue Information</Heading>

      {/* Venue Name with Google Places Autocomplete */}
      <View width="100%">
        <View marginBottom="size-100">
          <label htmlFor="venue-name-input" style={{ 
            display: 'block',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: 'var(--spectrum-global-color-gray-800)'
          }}>
            Venue Name <span style={{ color: 'var(--spectrum-global-color-red-600)' }}>*</span>
          </label>
          <input
            id="venue-name-input"
            ref={venueNameInputRef}
            type="text"
            value={venueNameValue}
            onChange={(e) => handleVenueNameChange(e.target.value)}
            maxLength={80}
            required
            aria-label="Venue Name"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              border: placesApiError 
                ? '1px solid var(--spectrum-global-color-red-600)' 
                : '1px solid var(--spectrum-global-color-gray-400)',
              borderRadius: '4px',
              backgroundColor: 'var(--spectrum-global-color-gray-50)',
              color: 'var(--spectrum-global-color-gray-800)',
              fontFamily: 'adobe-clean, sans-serif',
              boxSizing: 'border-box'
            }}
          />
          <Text UNSAFE_style={{ 
            fontSize: '12px', 
            color: placesApiError 
              ? 'var(--spectrum-global-color-red-600)' 
              : 'var(--spectrum-global-color-gray-700)',
            marginTop: '4px',
            display: 'block'
          }}>
            {placesApiError 
              ? `⚠️ ${placesApiError}` 
              : placesApiLoaded 
                ? "Start typing to search for venues" 
                : "Loading venue autocomplete..."}
          </Text>
        </View>
      </View>

      {/* Venue Address - Auto-populated but editable */}
      <View width="100%">
        <TextField
          label="Venue Address"
          width="100%"
          value={venue.formattedAddress || ''}
          onChange={handleAddressChange}
          description="Auto-populated from venue selection, but editable"
        />
      </View>

      {/* Venue Image Uploader */}
      <ImageUploader
        label="Venue Image"
        imageUrl={venue.venueImageUrl}
        imageId={venue.venueImageId}
        imageKind="venue-image"
        altText={`Venue image for ${venue.venueName}`}
        eventId={eventId ?? undefined}
        description="Upload an image of the venue"
        recommendedDimensions="1920px wide"
        maxSizeMB={25}
        onChange={handleImageChange}
        onRemove={handleImageRemove}
      />

      {/* Venue Additional Information */}
      <View width="100%">
        <RichTextEditor
          label="Venue Additional Information (Optional)"
          value={venue.additionalInformation || ''}
          onChange={handleAdditionalInfoChange}
          height="250px"
          description="Additional details about the venue"
        />
      </View>

      {/* Post-event visibility toggles */}
      <Checkbox
        isSelected={venue.showVenuePostEvent || false}
        onChange={handleShowVenuePostEventChange}
      >
        Venue info will appear post-event
      </Checkbox>

      <Checkbox
        isSelected={venue.showAdditionalInfoPostEvent || false}
        onChange={handleShowAdditionalInfoPostEventChange}
      >
        Venue additional info will appear post-event
      </Checkbox>
    </Flex>
  )
}
