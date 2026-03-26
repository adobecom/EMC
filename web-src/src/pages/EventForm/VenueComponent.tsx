/* 
* <license header>
*/

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { TextField, Text, Heading, ActionButton } from '@react-spectrum/s2'
import { Switch } from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import Add from '@react-spectrum/s2/icons/Add'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import { ImageUploader, RichTextEditor } from '../../components/shared'
import { TYPOGRAPHY, COLORS } from '../../styles/designSystem'
import { VenueData, EventApiResponse } from '../../types/domain'
import { loadGooglePlacesAPI } from '../../utils/loadGooglePlaces'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { apiService } from '../../services/api'
import { getVenuePayload } from '../../utils/dataFilters'
import { uploadImage } from '../../services/requestHelpers'
import { getCurrentEnvironment, getApiHost } from '../../config/constants'
import '../../../src/types/google-places.d.ts'

// ============================================================================
// CONSTANTS
// ============================================================================

const VENUE_NAME_MAX_LENGTH = 80

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
 * 
 * State Architecture:
 * - venueNameValue (local): Controls the Google Places autocomplete <input> only.
 *   Always shows the Google Places name (or typed search text).
 * - alternativeVenueName (local): The user-provided alternative display name.
 * - venue.venueName (context): The name sent to the API.
 *   Equals googlePlaceName when no alternative is active, or the alternative name.
 * - venue.googlePlaceName (context): Immutable record of the Google Places name.
 *   Set only by place selection; never touched by manual typing or alternative name.
 * - venue.placeId (context): Set only by place selection.
 *   Cleared when user edits the main input (signals "needs re-selection").
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
     * After the main event save, create or update the venue and upload pending image.
     *
     * Important: `eventResponse` comes from the event update/create API and may
     * NOT include nested venue data. We therefore fetch the existing venue via a
     * dedicated GET so the create-vs-update decision is always correct.
     */
    onAfterSave: async (savedEventId: string, _eventResponse: EventApiResponse) => {
      const venueData = formData.venue
      
      // ========================================================================
      // 1. Upload pending venue image (if any)
      // ========================================================================
      const pendingFile = pendingImageFileRef.current
      if (pendingFile) {
        try {
          const token = apiService.getAuthTokenForExternalUse()
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
              pendingImageFileRef.current = null
              updateFormData({
                venue: {
                  ...venueData,
                  venueName: venueData?.venueName || '',
                  venueImageUrl: result.imageUrl,
                  venueImageId: result.imageId
                }
              })
            }
          }
        } catch (error) {
          console.error('Failed to upload venue image:', error)
        }
      }
      
      // ========================================================================
      // 2. Create or update venue
      // ========================================================================
      
      // Skip entirely if no venue name is entered
      if (!venueData?.venueName?.trim()) {
        return
      }
      
      // --- Fetch existing venue (authoritative; don't rely on eventResponse) ---
      let existingVenue: any = null
      try {
        const venueResult = await apiService.getEventVenue(savedEventId)
        if (venueResult && !('error' in venueResult)) {
          existingVenue = venueResult
        }
      } catch {
        // No existing venue or fetch failed — treat as new
      }
      
      // --- Detect changes -------------------------------------------------------
      if (existingVenue) {
        const existingLocalized = existingVenue.localizations?.[locale] || {}
        
        const placeIdSame = venueData.placeId === existingVenue.placeId
        const venueNameSame = venueData.venueName === existingVenue.venueName
        const additionalInfoSame =
          (venueData.additionalInformation || '') ===
          (existingLocalized.additionalInformation ?? existingVenue.additionalInformation ?? '')
        
        if (placeIdSame && venueNameSame && additionalInfoSame) {
          // Nothing relevant changed — skip the API call entirely
          return
        }
      }
      
      // --- Build payload --------------------------------------------------------
      // Start from form data for the fields the user may have changed
      const basePayload = getVenuePayload({
        venueName: venueData.venueName,
        placeId: venueData.placeId,
        coordinates: venueData.coordinates,
        gmtOffset: venueData.gmtOffset,
        formattedAddress: venueData.formattedAddress,
        addressComponents: venueData.addressComponents,
        additionalInformation: venueData.additionalInformation,
      }, locale)
      
      // For updates, fill in any required fields that our form data might be
      // missing (e.g. addressComponents is not always round-tripped from the GET)
      if (existingVenue) {
        if (!basePayload.formattedAddress) {
          basePayload.formattedAddress =
            existingVenue.formattedAddress || existingVenue.address || ''
        }
        if (!basePayload.addressComponents && existingVenue.addressComponents) {
          basePayload.addressComponents = existingVenue.addressComponents
        }
        if (basePayload.coordinates === undefined && existingVenue.coordinates) {
          basePayload.coordinates = existingVenue.coordinates
        }
        if (basePayload.gmtOffset === undefined && existingVenue.gmtOffset !== undefined) {
          basePayload.gmtOffset = existingVenue.gmtOffset
        }
        if (!basePayload.placeId && existingVenue.placeId) {
          basePayload.placeId = existingVenue.placeId
        }
      }
      
      try {
        if (!existingVenue) {
          // ---- CREATE (POST) ----
          const result = await apiService.createVenue(savedEventId, basePayload)
          if ('error' in result) {
            console.error('Failed to create venue:', result)
            return
          }
        } else {
          // ---- UPDATE (PUT) — include venueId + timestamps as required by API ----
          const putPayload = {
            ...basePayload,
            venueId: existingVenue.venueId,
            creationTime: existingVenue.creationTime,
            modificationTime: existingVenue.modificationTime,
          }
          
          const result = await apiService.replaceVenue(
            savedEventId,
            existingVenue.venueId,
            putPayload
          )
          
          if ('error' in result) {
            console.error('Failed to update venue:', result)
            return
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
  const [placesApiError, setPlacesApiError] = useState<string | null>(null)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [placeSelected, setPlaceSelected] = useState(() => Boolean(venue.placeId))
  
  // The Google Places autocomplete input value (tracks the Google name / search text)
  const [venueNameValue, setVenueNameValue] = useState(
    venue.googlePlaceName || venue.venueName || ''
  )
  
  // Alternative venue name state
  const [showAlternativeNameField, setShowAlternativeNameField] = useState(
    venue.useAlternativeVenueName || false
  )
  const [alternativeVenueName, setAlternativeVenueName] = useState(
    // If alt name was active, the current venueName IS the alternative name
    venue.useAlternativeVenueName ? (venue.venueName || '') : ''
  )
  
  // Deferred image upload state - used when creating new events (no eventId yet)
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const pendingImageFileRef = useRef<File | null>(null)
  
  // Keep ref in sync with state for use in onAfterSave callback
  useEffect(() => {
    pendingImageFileRef.current = pendingImageFile
  }, [pendingImageFile])
  
  // ============================================================================
  // REFS FOR CALLBACK STABILITY
  // ============================================================================
  
  // Ref-based venue updater: always reads the latest venue from formData,
  // so callbacks in long-lived listeners never merge with stale data.
  const formDataRef = useRef(formData)
  useEffect(() => { formDataRef.current = formData }, [formData])
  
  const updateVenueStable = useCallback((updates: Partial<VenueData>) => {
    const currentVenue = formDataRef.current.venue || {
      venueName: '',
      formattedAddress: ''
    }
    updateFormData({ venue: { ...currentVenue, ...updates } })
  }, [updateFormData])
  
  // Ref for the place_changed handler so the Google listener always calls
  // through to the latest version without effect re-runs.
  const showAltFieldRef = useRef(showAlternativeNameField)
  useEffect(() => { showAltFieldRef.current = showAlternativeNameField }, [showAlternativeNameField])
  
  // ============================================================================
  // GOOGLE PLACES AUTOCOMPLETE — initialised once
  // ============================================================================
  
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  
  useEffect(() => {
    let isMounted = true

    const initAutocomplete = async () => {
      try {
        await loadGooglePlacesAPI()
        if (!isMounted || !venueNameInputRef.current) return
        
        // Guard against double-init (StrictMode or fast re-mount)
        if (autocompleteRef.current) return

        const instance = new window.google.maps.places.Autocomplete(
          venueNameInputRef.current,
          {
            types: ['establishment'],
            fields: [
              'place_id', 'name', 'formatted_address',
              'address_components', 'geometry', 'utc_offset_minutes'
            ]
          }
        )

        instance.addListener('place_changed', () => {
          if (!isMounted) return
          
          const place = instance.getPlace()
          
          if (!place || place.name === undefined) {
            if (window.google?.maps?.places) {
              setPlacesApiError('Autocomplete unavailable. Please enter venue details manually.')
            }
            return
          }
          
          if (place.place_id) {
            setPlacesApiError(null)
            setPlaceSelected(true)
            
            const updates: Partial<VenueData> = {
              venueName: place.name || '',
              googlePlaceName: place.name || '',
              formattedAddress: place.formatted_address || '',
              placeId: place.place_id,
              useAlternativeVenueName: false
            }

            if (place.geometry?.location) {
              updates.coordinates = {
                lat: place.geometry.location.lat(),
                lon: place.geometry.location.lng()
              }
            }

            if (place.utc_offset_minutes !== undefined) {
              updates.gmtOffset = place.utc_offset_minutes / 60
            }
            
            if (place.address_components) {
              updates.addressComponents = place.address_components.map((c: any) => ({
                longName: c.long_name,
                shortName: c.short_name,
                types: c.types
              }))
            }

            // Update local input to show the selected place name
            setVenueNameValue(place.name || '')
            // Reset alternative name
            setAlternativeVenueName('')
            setShowAlternativeNameField(false)
            // Persist to form context (uses ref — always latest venue)
            updateVenueStable(updates)
          }
        })

        autocompleteRef.current = instance
      } catch (error) {
        if (!isMounted) return
        
        console.error('Error initializing Google Places Autocomplete:', error)
        const errorMessage = error instanceof Error
          ? error.message
          : 'Failed to load Google Places API'
        setPlacesApiError(errorMessage)
      }
    }

    initAutocomplete()

    return () => {
      isMounted = false
      if (autocompleteRef.current && window.google?.maps) {
        (window.google.maps as any).event?.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Intentionally empty — initialise once; callbacks use refs.
  
  // ============================================================================
  // SYNC — only for external changes (e.g. edit-mode load from API)
  // ============================================================================
  
  const isInitialSyncDone = useRef(false)
  
  useEffect(() => {
    // Don't overwrite the Google Places input when the alternative field
    // controls venue.venueName — it would clobber the search text.
    if (showAlternativeNameField) return
    
    const contextName = venue.googlePlaceName || venue.venueName || ''
    if (contextName && contextName !== venueNameValue) {
      setVenueNameValue(contextName)
    }
    
    // Form reopened with saved venue: keep placeSelected in sync so step stays valid
    if (venue.placeId && !placeSelected) {
      setPlaceSelected(true)
    }
    
    // On first load (edit mode), sync alternative name state too
    if (!isInitialSyncDone.current && venue.useAlternativeVenueName) {
      setShowAlternativeNameField(true)
      setAlternativeVenueName(venue.venueName || '')
      isInitialSyncDone.current = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue.venueName, venue.googlePlaceName, venue.useAlternativeVenueName, venue.placeId])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  /**
   * User is typing in the Google Places autocomplete input.
   * This is a search query — the actual venue is only confirmed when they
   * pick from the autocomplete dropdown (place_changed).
   * 
   * We clear stale place data so that validation catches the intermediate state.
   */
  const handleVenueNameChange = (value: string) => {
    setVenueNameValue(value)
    setPlaceSelected(false)

    // Clear place-specific data — the user is searching for a new venue.
    // Keep non-place fields (images, instructions, post-event toggles).
    updateVenueStable({
      // Update venueName only if alternative name is NOT controlling it
      venueName: showAlternativeNameField ? formDataRef.current.venue?.venueName || '' : value,
      placeId: undefined,
      googlePlaceName: undefined,
      coordinates: undefined,
      formattedAddress: '',
      gmtOffset: undefined,
      addressComponents: undefined
    })
  }
  
  /**
   * Toggle the alternative venue name field.
   * 
   * On enable: pre-populate with the current Google name; main input keeps
   *   showing the Google name for autocomplete purposes.
   * On disable: revert venue.venueName to the Google Places name (or the
   *   current main input value as fallback).
   */
  const handleAlternativeNameToggle = () => {
    const enabling = !showAlternativeNameField
    setShowAlternativeNameField(enabling)
    
    if (enabling) {
      // Pre-fill the alternative field with the current Google name
      const currentGoogleName = venue.googlePlaceName || venueNameValue || ''
      setAlternativeVenueName(currentGoogleName)
      updateVenueStable({ useAlternativeVenueName: true })
    } else {
      // Revert to the Google Places name
      const googleName = venue.googlePlaceName || venueNameValue || ''
      setAlternativeVenueName('')
      setVenueNameValue(googleName)
      updateVenueStable({
        venueName: googleName,
        useAlternativeVenueName: false
      })
    }
  }
  
  /**
   * User is editing the alternative venue name.
   * Updates venue.venueName (the API submission name) but does NOT
   * touch the Google Places input or placeId.
   */
  const handleAlternativeNameChange = (value: string) => {
    setAlternativeVenueName(value)
    updateVenueStable({ venueName: value })
  }
  
  const handleShowVenuePostEventChange = (checked: boolean) => {
    updateVenueStable({ showVenuePostEvent: checked })
  }
  
  const handleShowVenueImagePostEventChange = (checked: boolean) => {
    updateVenueStable({ showVenueImagePostEvent: checked })
  }
  
  const handleAdditionalInfoChange = (value: string) => {
    updateVenueStable({ additionalInformation: value })
  }
  
  const handleImageChange = (imageUrl: string | undefined, imageId: string | undefined) => {
    // Clear pending file since we now have an uploaded image
    setPendingImageFile(null)
    updateVenueStable({ 
      venueImageUrl: imageUrl, 
      venueImageId: imageId 
    })
  }
  
  const handleImageRemove = () => {
    // Clear both pending file and uploaded image
    setPendingImageFile(null)
    updateVenueStable({ 
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
    <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
      {/* Section Heading */}
      <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>
        Venue information<span style={{ color: COLORS.RED_600 }}>*</span>
      </Heading>

      {/* Post-event visibility toggle */}
      <Switch
        isSelected={venue.showVenuePostEvent || false}
        onChange={handleShowVenuePostEventChange}
        UNSAFE_style={{
          width: 'max-content'
        }}
      >
        Display venue info post-event.
      </Switch>

      {/* Venue Name Field */}
      <div style={{ width: '100%' }}>
        <div className={style({display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4})}>
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
            {VENUE_NAME_MAX_LENGTH} characters max
          </Text>
        </div>

        <input
          id="venue-name-input"
          ref={venueNameInputRef}
          type="text"
          value={venueNameValue}
          onChange={(e) => handleVenueNameChange(e.target.value)}
          onBlur={() => setHasAttemptedSubmit(true)}
          maxLength={VENUE_NAME_MAX_LENGTH}
          placeholder="Where it's at"
          aria-label="Venue Name"
          aria-describedby={showVenueNameError ? 'venue-name-error' : undefined}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            border: '2px solid rgb(218, 218, 218)',
            borderRadius: '8px',
            backgroundColor: COLORS.WHITE,
            color: COLORS.GRAY_800,
            boxSizing: 'border-box'
          }}
        />
        
        {showVenueNameError && (
          <Text 
            id="venue-name-error"
            UNSAFE_style={{ 
              fontSize: '12px', 
              color: COLORS.RED_600,
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
            color: COLORS.RED_600,
            marginTop: '4px',
            display: 'block'
          }}>
            {placesApiError}
          </Text>
        )}
      </div>

      {/* Alternative Venue Name Toggle */}
      <div>
        <ActionButton
          isQuiet
          onPress={handleAlternativeNameToggle}
          UNSAFE_style={{
            color: COLORS.GRAY_800,
            padding: 0,
            marginLeft: '-8px'
          }}
        >
          {showAlternativeNameField ? <RemoveCircle /> : <Add />}
          <Text UNSAFE_style={{ marginLeft: '4px', color: COLORS.GRAY_800 }}>
            {showAlternativeNameField 
              ? 'Remove alternative venue name' 
              : 'Add alternative venue name (optional)'}
          </Text>
        </ActionButton>
        
        {showAlternativeNameField && (
          <div style={{ marginTop: '16px' }}>
            <TextField
              label="Alternative venue name"
              styles={style({ width: '[100%]' })}
              value={alternativeVenueName}
              onChange={handleAlternativeNameChange}
              maxLength={VENUE_NAME_MAX_LENGTH}
              description="This name will be displayed instead of the Google Places name"
            />
          </div>
        )}
      </div>

      {/* Venue Image Section */}
      <div className={style({display: 'flex', flexDirection: 'column', gap: 16})}>
        <Heading level={4} UNSAFE_style={TYPOGRAPHY.SUBSECTION_HEADING}>
          Venue image or map
        </Heading>

        <Switch
          isSelected={venue.showVenueImagePostEvent || false}
          onChange={handleShowVenueImagePostEventChange}
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
      </div>

      {/* Instructions for Attendees */}
      <div style={{ marginTop: '16px' }}>
        <RichTextEditor
          label="Instructions for attendees"
          value={venue.additionalInformation || ''}
          onChange={handleAdditionalInfoChange}
          height="200px"
        />
      </div>
    </div>
  )
}
