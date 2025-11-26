/* 
* <license header>
*/

import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Checkbox,
  Flex,
  Heading,
  Text,
  TextField
} from '@adobe/react-spectrum'
import { RichTextEditor, ImageUploader } from '../shared'
import { TYPOGRAPHY } from '../../styles/designSystem'
import { VenueData } from '../../types/domain'
import { loadGooglePlacesAPI } from '../../utils/loadGooglePlaces'
import '../../../src/types/google-places.d.ts'

interface VenueComponentProps {
  venue: VenueData
  eventId?: string
  onChange: (updates: Partial<VenueData>) => void
}

export const VenueComponent: React.FC<VenueComponentProps> = ({
  venue,
  eventId,
  onChange
}) => {
  const venueNameInputRef = useRef<HTMLInputElement>(null)
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)
  const [venueNameValue, setVenueNameValue] = useState(venue.venueName || '')
  const [placesApiError, setPlacesApiError] = useState<string | null>(null)
  const [placesApiLoaded, setPlacesApiLoaded] = useState(false)

  useEffect(() => {
    let isMounted = true
    let autocompleteInstance: google.maps.places.Autocomplete | null = null

    const initAutocomplete = async () => {
      try {
        // Load Google Places API
        await loadGooglePlacesAPI()
        if (!isMounted) return
        
        setPlacesApiLoaded(true)

        // Initialize autocomplete after API is loaded
        if (venueNameInputRef.current && !autocomplete) {
          autocompleteInstance = new window.google.maps.places.Autocomplete(
            venueNameInputRef.current,
            {
              types: ['establishment'],
              fields: ['place_id', 'name', 'formatted_address', 'address_components', 'geometry', 'utc_offset_minutes']
            }
          )

          // Listen for API errors (like domain restrictions)
          autocompleteInstance.addListener('place_changed', () => {
            if (!isMounted) return
            
            const place = autocompleteInstance?.getPlace()
            
            // Check for API errors
            if (!place || place.name === undefined) {
              // This usually means an API error occurred
              if (window.google?.maps?.places) {
                console.warn('Google Places API error - possibly domain restriction')
                setPlacesApiError('Autocomplete unavailable. Please enter venue details manually.')
              }
              return
            }
            
            if (place && place.place_id) {
              // Clear any previous errors
              setPlacesApiError(null)
              
              const updates: Partial<VenueData> = {
                venueName: place.name || '',
                formattedAddress: place.formatted_address || '',
                placeId: place.place_id
              }

              // Extract coordinates
              if (place.geometry && place.geometry.location) {
                updates.coordinates = {
                  lat: place.geometry.location.lat(),
                  lon: place.geometry.location.lng()
                }
              }

              // Extract GMT offset
              if (place.utc_offset_minutes !== undefined) {
                updates.gmtOffset = place.utc_offset_minutes
              }

              // Update state
              setVenueNameValue(place.name || '')
              onChange(updates)
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
        // Clean up Google Places autocomplete listeners
        window.google?.maps?.event?.clearInstanceListeners(autocompleteInstance)
      }
    }
  }, [autocomplete, onChange])

  const handleVenueNameChange = (value: string) => {
    setVenueNameValue(value)
    // If user manually types (not from autocomplete), update the venue name
    onChange({ venueName: value })
  }

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
          onChange={(value) => onChange({ formattedAddress: value })}
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
        eventId={eventId}
        description="Upload an image of the venue"
        recommendedDimensions="1920px wide"
        maxSizeMB={25}
        onChange={(imageUrl, imageId) => {
          onChange({ 
            venueImageUrl: imageUrl, 
            venueImageId: imageId 
          })
        }}
        onRemove={() => {
          onChange({ 
            venueImageUrl: undefined, 
            venueImageId: undefined 
          })
        }}
      />

      {/* Venue Additional Information */}
      <View width="100%">
        <RichTextEditor
          label="Venue Additional Information (Optional)"
          value={venue.additionalInformation || ''}
          onChange={(value) => onChange({ additionalInformation: value })}
          height="250px"
          description="Additional details about the venue"
        />
      </View>

      {/* Post-event visibility toggles */}
      <Checkbox
        isSelected={venue.showVenuePostEvent || false}
        onChange={(value) => onChange({ showVenuePostEvent: value })}
      >
        Venue info will appear post-event
      </Checkbox>

      <Checkbox
        isSelected={venue.showAdditionalInfoPostEvent || false}
        onChange={(value) => onChange({ showAdditionalInfoPostEvent: value })}
      >
        Venue additional info will appear post-event
      </Checkbox>
    </Flex>
  )
}
