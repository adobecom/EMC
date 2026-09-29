/* 
* <license header>
*/

import React from 'react'
import { TextField, Text, ActionButton, Button } from '@react-spectrum/s2'
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import {
  LAYOUT_PATTERNS,
  SPACING,
  SURFACES,
  TYPOGRAPHY,
  createPadding,
} from '../../styles/designSystem'
import { AddressComponent } from '../../types/domain'
import {
  areAddressComponentsEqual,
  getAddressComponentLabel,
  isProtectedAddressComponent,
} from '../../utils/venueAddress'

export type AddressComponentField = 'longName' | 'shortName'

interface VenueAddressEditorProps {
  formattedAddress: string
  addressComponents: AddressComponent[]
  /** Original values from Google Places; only known when a place was picked in this session */
  googleFormattedAddress?: string
  googleAddressComponents?: AddressComponent[]
  onFormattedAddressChange: (value: string) => void
  onComponentChange: (index: number, field: AddressComponentField, value: string) => void
  onComponentRemove: (index: number) => void
  onReset: () => void
}

/**
 * Lets the user override the Google Places address (formatted address and
 * individual address components) before it is sent to the venue API.
 * placeId, coordinates and gmtOffset are never touched.
 */
export const VenueAddressEditor: React.FC<VenueAddressEditorProps> = ({
  formattedAddress,
  addressComponents,
  googleFormattedAddress,
  googleAddressComponents,
  onFormattedAddressChange,
  onComponentChange,
  onComponentRemove,
  onReset,
}) => {
  const hasGoogleOriginal = googleFormattedAddress !== undefined
  const isModified = hasGoogleOriginal && (
    formattedAddress !== googleFormattedAddress
    || !areAddressComponentsEqual(addressComponents, googleAddressComponents)
  )

  return (
    <div
      data-testid="venue-address-editor"
      className={style({display: 'flex', flexDirection: 'column', gap: 16})}
      style={{
        ...createPadding(SPACING.MD),
        border: `1px solid ${SURFACES.BORDER}`,
        borderRadius: '8px'
      }}
    >
      <TextField
        data-testid="venue-formatted-address-input"
        label="Venue address"
        styles={style({ width: '[100%]' })}
        value={formattedAddress}
        onChange={onFormattedAddressChange}
        isRequired
        isInvalid={!formattedAddress.trim()}
        errorMessage="Add the venue address."
        description={
          isModified && googleFormattedAddress
            ? `Google Places address: ${googleFormattedAddress}`
            : 'Shown to attendees. Edit to remove details such as a floor or suite.'
        }
      />

      {addressComponents.length > 0 && (
        <div className={style({display: 'flex', flexDirection: 'column', gap: 8})}>
          <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>
            Address components
          </Text>
          <Text UNSAFE_style={TYPOGRAPHY.HELPER_TEXT}>
            Changing these does not update the venue address above. City, state, country and
            postal code can be edited but not removed.
          </Text>

          {addressComponents.map((component, index) => {
            const label = getAddressComponentLabel(component.types)
            const isProtected = isProtectedAddressComponent(component)
            return (
              <div
                key={`${index}-${(component.types || []).join('|')}`}
                data-testid="venue-address-component-row"
                style={{ ...LAYOUT_PATTERNS.FIELD_ROW, gap: SPACING.SM }}
              >
                <div style={{ flex: 2, minWidth: 0 }}>
                  <TextField
                    label={label}
                    styles={style({ width: '[100%]' })}
                    value={component.longName}
                    onChange={(value) => onComponentChange(index, 'longName', value)}
                    isInvalid={!component.longName?.trim()}
                    errorMessage={isProtected ? `Add the ${label.toLowerCase()}.` : 'Add a value or remove this line.'}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <TextField
                    label={`${label} (short)`}
                    styles={style({ width: '[100%]' })}
                    value={component.shortName}
                    onChange={(value) => onComponentChange(index, 'shortName', value)}
                    isInvalid={!component.shortName?.trim()}
                    errorMessage="Add a short value."
                  />
                </div>
                {/* Fixed-width slot keeps rows aligned whether or not they can be removed */}
                <div style={{ width: SPACING.XL, flexShrink: 0, paddingTop: SPACING.LG }}>
                  {!isProtected && (
                    <ActionButton
                      isQuiet
                      aria-label={`Remove ${label}`}
                      onPress={() => onComponentRemove(index)}
                    >
                      <RemoveCircle />
                    </ActionButton>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isModified && (
        <div>
          <Button variant="secondary" onPress={onReset}>
            Reset to Google Places address
          </Button>
        </div>
      )}
    </div>
  )
}
