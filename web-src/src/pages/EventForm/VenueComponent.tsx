/* 
* <license header>
*/

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Flex,
  Heading,
  Text,
  TextField,
  ActionButton,
  Switch
} from '@adobe/react-spectrum'
import Add from '@spectrum-icons/workflow/Add'
import Remove from '@spectrum-icons/workflow/Remove'
import { ImageUploader, RichTextEditor } from '../../components/shared'
import { TYPOGRAPHY, COLORS } from '../../styles/designSystem'
import { VenueData, EventApiResponse } from '../../types/domain'
import { loadGooglePlacesAPI } from '../../utils/loadGooglePlaces'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { apiService } from '../../services/api'
import { getVenuePayload } from '../../utils/dataFilters'
import { uploadImage } from '../../services/requestHelpers'
import { tokenStorage } from '../../services/tokenStorage'
import { getCurrentEnvironment, getApiHost } from '../../config/environmentConfig'
import { EVENT_FORM_LIMITS } from '../../config/uiConstants'
import '../../../src/types/google-places.d.ts'

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * VenueComponent - Manages venue information for in-person events
 * 
 * Features:
 * - Google Places autocomplete for venue search
 * - Alternative venue name override
 * - Venue image upload
 * - Instructions for attendees
 * - Post-event visibility toggles
 * 
 * Lifecycle Integration:
 * - Uses useEventFormComponent hook for context integration
 * - onAfterSave: Creates or replaces venue via API after event is saved
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
     * After the main event save, create or update the venue and upload pending image
     */
    onAfterSave: async (savedEventId: string, eventResponse: EventApiResponse) => {
      const venueData = formData.venue
      
      // ========================================================================
      // 1. Upload pending venue image (if any)
      // ========================================================================
      const pendingFile = pendingImageFileRef.current
      if (pendingFile) {
        try {
          const token = tokenStorage.getValidToken()
          if (token) {
            const currentEnv = getCurrentEnvironment()
            const host = getApiHost('esp', currentEnv)
            const uploadUrl = `${host}/v1/events/${savedEventId}/images`
            
            const config = {
              targetUrl: uploadUrl,
              altText: `Venue image for ${venueData?.venueName || 'event'}`,
              type: 'venue-image'
            }
            
            const result = await uploadImage(pendingFile, config, token)
            
            if (result.imageUrl && result.imageId) {
              console.log('Venue image uploaded successfully:', result)
              // Update venue data with the uploaded image info
              // Note: This updates local state; the image is now associated with the event
            }
          }
        } catch (error) {
          console.error('Failed to upload venue image:', error)
          // Don't block venue creation if image upload fails
        }
      }
      
      // ========================================================================
      // 2. Create or update venue
      // ========================================================================
      
      // Skip if no venue name entered
      if (!venueData?.venueName?.trim()) {
        return
      }
      
      // Build the localized venue payload
      const venuePayload = getVenuePayload({
        venueName: venueData.venueName,
        placeId: venueData.placeId,
        coordinates: venueData.coordinates,
        gmtOffset: venueData.gmtOffset,
        formattedAddress: venueData.formattedAddress,
        addressComponents: venueData.addressComponents,
        additionalInformation: venueData.additionalInformation,
      }, locale)
      
      const existingVenue = eventResponse.venue
      
      try {
        if (!existingVenue) {
          const result = await apiService.createVenue(savedEventId, venuePayload)
          if ('error' in result) {
            console.error('Failed to create venue:', result)
            return
          }
          console.log('Venue created successfully:', result)
        } else {
          const hasPlaceIdChanged = venuePayload.placeId !== existingVenue.placeId
          const hasAdditionalInfoChanged = venueData.additionalInformation !== existingVenue.additionalInformation
          
          if (hasPlaceIdChanged || hasAdditionalInfoChanged) {
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
      }
    },
    
    /**
     * Validate venue data before save
     */
    validate: () => {
      const venueData = formData.venue
      
      if (venueData?.venueName?.trim() && !venueData?.placeId) {
        return 'Please select a valid venue from the autocomplete suggestions'
      }
      
      return true
    }
  })
  
  // Get venue data from form context with defaults
  const venue = formData.venue || {
    venueName: '',
    formattedAddress: '',
    additionalInformation: '',
    showVenuePostEvent: false,
    showVenueImagePostEvent: false,
    showAdditionalInfoPostEvent: false,
    useAlternativeVenueName: false,
    googlePlaceName: ''
  }
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const venueNameInputRef = useRef<HTMLInputElement>(null)
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)
  const [venueNameValue, setVenueNameValue] = useState(venue.venueName || '')
  const [placesApiError, setPlacesApiError] = useState<string | null>(null)
  const [showAlternativeNameField, setShowAlternativeNameField] = useState(venue.useAlternativeVenueName || false)
  const [alternativeVenueName, setAlternativeVenueName] = useState('')
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  
  // Deferred image upload state - used when creating new events (no eventId yet)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const pendingImageFileRef = useRef<File | null>(null)
  
  // Keep ref in sync with state for use in onAfterSave callback
  useEffect(() => {
    pendingImageFileRef.current = pendingImageFile
  }, [pendingImageFile])
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
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
                googlePlaceName: place.name || '', // Store original Google name
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
                updates.gmtOffset = place.utc_offset_minutes / 60
              }
              
              if (place.address_components) {
                updates.addressComponents = place.address_components.map((component: any) => ({
                  longName: component.long_name,
                  shortName: component.short_name,
                  types: component.types
                }))
              }

              setVenueNameValue(place.name || '')
              // Reset alternative name when selecting new venue
              setAlternativeVenueName('')
              setShowAlternativeNameField(false)
              updateVenue({
                ...updates,
                useAlternativeVenueName: false
              })
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
    if (venue.useAlternativeVenueName !== showAlternativeNameField) {
      setShowAlternativeNameField(venue.useAlternativeVenueName || false)
    }
  }, [venue.venueName, venue.useAlternativeVenueName])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleVenueNameChange = (value: string) => {
    setVenueNameValue(value)
    updateVenue({ venueName: value })
  }
  
  const handleAlternativeNameToggle = () => {
    const newValue = !showAlternativeNameField
    setShowAlternativeNameField(newValue)
    
    if (newValue) {
      // Opening alternative name field - pre-populate with Google name
      setAlternativeVenueName(venue.googlePlaceName || venue.venueName || '')
      updateVenue({
        useAlternativeVenueName: true
      })
    } else {
      // Closing alternative name field - revert to Google name
      setAlternativeVenueName('')
      if (venue.googlePlaceName) {
        updateVenue({
          venueName: venue.googlePlaceName,
          useAlternativeVenueName: false
        })
        setVenueNameValue(venue.googlePlaceName)
      } else {
        updateVenue({
          useAlternativeVenueName: false
        })
      }
    }
  }
  
  const handleAlternativeNameChange = (value: string) => {
    setAlternativeVenueName(value)
    // Update the venueName with the alternative name
    updateVenue({ venueName: value })
  }
  
  const handleShowVenuePostEventChange = (checked: boolean) => {
    updateVenue({ showVenuePostEvent: checked })
  }
  
  const handleShowVenueImagePostEventChange = (checked: boolean) => {
    updateVenue({ showVenueImagePostEvent: checked })
  }
  
  const handleAdditionalInfoChange = (value: string) => {
    updateVenue({ additionalInformation: value })
  }
  
  const handleImageChange = (imageUrl: string | undefined, imageId: string | undefined) => {
    // Clear pending file since we now have an uploaded image
    setPendingImageFile(null)
    updateVenue({ 
      venueImageUrl: imageUrl, 
      venueImageId: imageId 
    })
  }
  
  const handleImageRemove = () => {
    // Clear both pending file and uploaded image
    setPendingImageFile(null)
    updateVenue({ 
      venueImageUrl: undefined, 
      venueImageId: undefined 
    })
  }
  
  /**
   * Handle file selection in deferred upload mode (when no eventId exists yet)
   * The file will be uploaded in onAfterSave after the event is created
   */
  const handleImageFileSelected = (file: File) => {
    setPendingImageFile(file)
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================
  
  const isVenueNameEmpty = !venueNameValue.trim()
  const showVenueNameError = hasAttemptedSubmit && isVenueNameEmpty

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap="size-300">
      {/* Section Heading */}
      <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>
        Venue information<span style={{ color: COLORS.ADOBE_RED }}>*</span>
      </Heading>

      {/* Post-event visibility toggle */}
      <Switch
        isSelected={venue.showVenuePostEvent || false}
        onChange={handleShowVenuePostEventChange}
      >
        Display venue info post-event.
      </Switch>

      {/* Venue Name Field */}
      <View width="100%">
        <Flex justifyContent="space-between" alignItems="center" marginBottom="size-50">
          <Text UNSAFE_style={{ 
            fontSize: '14px',
            color: COLORS.GRAY_700
          }}>
            Venue name
          </Text>
          <Text UNSAFE_style={{ 
            fontSize: '12px',
            color: COLORS.GRAY_600
          }}>
            {EVENT_FORM_LIMITS.venueNameMaxLength} characters max
          </Text>
        </Flex>
        
        <input
          id="venue-name-input"
          ref={venueNameInputRef}
          type="text"
          value={venueNameValue}
          onChange={(e) => handleVenueNameChange(e.target.value)}
          onBlur={() => setHasAttemptedSubmit(true)}
          maxLength={EVENT_FORM_LIMITS.venueNameMaxLength}
          placeholder="Where it's at"
          aria-label="Venue Name"
          aria-describedby={showVenueNameError ? 'venue-name-error' : undefined}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: showVenueNameError
              ? `2px solid ${COLORS.ADOBE_RED}` 
              : '1px solid var(--spectrum-global-color-gray-400)',
            borderRadius: '4px',
            backgroundColor: 'var(--spectrum-global-color-gray-50)',
            color: COLORS.GRAY_800,
            fontFamily: 'adobe-clean, sans-serif',
            boxSizing: 'border-box'
          }}
        />
        
        {showVenueNameError && (
          <Text 
            id="venue-name-error"
            UNSAFE_style={{ 
              fontSize: '12px', 
              color: COLORS.ADOBE_RED,
              marginTop: '4px',
              display: 'block'
            }}
          >
            Add the venue name.
          </Text>
        )}
        
        {placesApiError && (
          <Text UNSAFE_style={{ 
            fontSize: '12px', 
            color: COLORS.ADOBE_RED,
            marginTop: '4px',
            display: 'block'
          }}>
            {placesApiError}
          </Text>
        )}
      </View>

      {/* Alternative Venue Name Toggle */}
      <View>
        <ActionButton
          isQuiet
          onPress={handleAlternativeNameToggle}
          UNSAFE_style={{
            color: COLORS.GRAY_800,
            padding: 0,
            marginLeft: '-8px'
          }}
        >
          {showAlternativeNameField ? <Remove size="S" /> : <Add size="S" />}
          <Text UNSAFE_style={{ marginLeft: '4px', color: COLORS.GRAY_800 }}>
            {showAlternativeNameField 
              ? 'Remove alternative venue name' 
              : 'Add alternative venue name (optional)'}
          </Text>
        </ActionButton>
        
        {showAlternativeNameField && (
          <View marginTop="size-200">
            <TextField
              label="Alternative venue name"
              width="100%"
              value={alternativeVenueName}
              onChange={handleAlternativeNameChange}
              maxLength={EVENT_FORM_LIMITS.venueNameMaxLength}
              description="This name will be displayed instead of the Google Places name"
            />
          </View>
        )}
      </View>

      {/* Venue Image Section */}
      <View marginTop="size-200">
        <Heading level={4} UNSAFE_style={TYPOGRAPHY.SUBSECTION_HEADING}>
          Venue image or map
        </Heading>
        
        <Switch
          isSelected={venue.showVenueImagePostEvent || false}
          onChange={handleShowVenueImagePostEventChange}
          marginTop="size-100"
          marginBottom="size-200"
        >
          Display image and instructions post-event.
        </Switch>
        
        <ImageUploader
          label=""
          imageUrl={venue.venueImageUrl}
          imageId={venue.venueImageId}
          imageKind="venue-image"
          altText={`Venue image for ${venue.venueName}`}
          eventId={eventId ?? undefined}
          maxSizeMB={25}
          onChange={handleImageChange}
          onRemove={handleImageRemove}
          dropzoneTitle="Add image"
          dropzoneDimensions="File dimensions 1920px wide."
          // Use deferred upload when creating new event (no eventId yet)
          // The image will be uploaded in onAfterSave after event creation
          deferUpload={!eventId}
          onFileSelected={handleImageFileSelected}
          pendingFile={pendingImageFile ?? undefined}
        />
      </View>

      {/* Instructions for Attendees */}
      <View marginTop="size-200">
        <RichTextEditor
          label="Instructions for attendees"
          value={venue.additionalInformation || ''}
          onChange={handleAdditionalInfoChange}
          height="200px"
        />
      </View>
    </Flex>
  )
}
