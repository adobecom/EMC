/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  TextField,
  NumberField,
  Switch,
  Flex,
  Text,
  TooltipTrigger,
  Tooltip,
  ActionButton
} from '@adobe/react-spectrum'
import { HeadingWithTooltip, RichTextEditor } from '../shared'
import Info from '@spectrum-icons/workflow/Info'
import { RegistrationFieldsComponent } from './RegistrationFieldsComponent'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'

/**
 * RegistrationConfigComponent - Manages event registration settings
 * 
 * Uses EventFormContext for state management.
 * Handles attendee limit, waitlist, guest registration, host email, RSVP description,
 * registration type, and RSVP form fields configuration.
 */
export const RegistrationConfigComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
  } = useEventFormComponent({
    componentId: 'registration-config',
  })
  
  // Destructure form data
  const cloudType = formData.cloudType || 'CreativeCloud'
  const venueName = formData.venue?.venueName
  const attendeeLimit = formData.attendeeLimit ?? 0
  const allowWaitlist = formData.allowWaitlist ?? false
  const allowGuestRegistration = formData.allowGuestRegistration ?? false
  const hostEmail = formData.hostEmail || ''
  const rsvpDescription = formData.rsvpDescription || ''
  const registrationType = formData.registrationType || 'ESP'
  const marketoFormUrl = formData.marketoFormUrl || ''
  const visibleRsvpFields = formData.visibleRsvpFields || []
  const requiredRsvpFields = formData.requiredRsvpFields || []
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [contactHostEnabled, setContactHostEnabled] = useState(!!hostEmail)

  useEffect(() => {
    setContactHostEnabled(!!hostEmail)
  }, [hostEmail])

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const isCreativeCloud = cloudType === 'CreativeCloud'
  const isExperienceCloud = cloudType === 'ExperienceCloud'
  const isWebinar = venueName === 'Webinar'

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleAttendeeLimitChange = (value: number) => {
    updateFormData({ attendeeLimit: value })
  }
  
  const handleAllowWaitlistChange = (value: boolean) => {
    updateFormData({ allowWaitlist: value })
  }
  
  const handleAllowGuestRegistrationChange = (value: boolean) => {
    updateFormData({ allowGuestRegistration: value })
  }
  
  const handleHostEmailChange = (value: string) => {
    updateFormData({ hostEmail: value })
  }
  
  const handleRsvpDescriptionChange = (value: string) => {
    updateFormData({ rsvpDescription: value })
  }
  
  const handleRegistrationTypeChange = (type: 'ESP' | 'Marketo') => {
    updateFormData({ registrationType: type })
  }
  
  const handleMarketoFormUrlChange = (url: string) => {
    updateFormData({ marketoFormUrl: url })
  }
  
  const handleVisibleFieldsChange = (fields: string[]) => {
    updateFormData({ visibleRsvpFields: fields })
  }
  
  const handleRequiredFieldsChange = (fields: string[]) => {
    updateFormData({ requiredRsvpFields: fields })
  }
  
  const handleContactHostToggle = (value: boolean) => {
    setContactHostEnabled(value)
    if (!value) {
      updateFormData({ hostEmail: '' })
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap="size-300">
      <HeadingWithTooltip 
        level={3}
        tooltip={
          isCreativeCloud 
            ? 'Optionally enable email links to the host or add a description to the RSVP process for your attendees.'
            : 'DX events are waitlist only. Call-to-action buttons will only allow waitlisting.'
        }
      >
        Registration Configuration
      </HeadingWithTooltip>

      <Flex direction="row" gap="size-400" alignItems="start">
        {/* Left: Attendee Limit Input */}
        <View>
          <Flex direction="row" gap="size-100" alignItems="center" marginBottom="size-100">
            <Text UNSAFE_style={{ fontWeight: 'bold' }}>Attendee limit</Text>
            <TooltipTrigger delay={0}>
              <ActionButton 
                isQuiet 
                UNSAFE_style={{ 
                  minWidth: 'auto',
                  padding: 0,
                  width: '20px',
                  height: '20px'
                }}
              >
                <Info size="S" />
              </ActionButton>
              <Tooltip variant="info">When no limit is set, all users will be admitted into event.</Tooltip>
            </TooltipTrigger>
          </Flex>
          <NumberField
            value={attendeeLimit}
            onChange={handleAttendeeLimitChange}
            minValue={0}
            hideStepper
            width="size-2000"
          />
        </View>

        {/* Right: All Toggles Container */}
        <Flex direction="column" gap="size-150" flex={1}>
          {/* Disable Waitlist Toggle */}
          <Flex direction="row" gap="size-100" alignItems="center">
            <Switch
              isSelected={!allowWaitlist}
              onChange={(value) => handleAllowWaitlistChange(!value)}
            >
              When limit is reached, disable registration button
            </Switch>
            <TooltipTrigger delay={0}>
              <ActionButton 
                isQuiet 
                UNSAFE_style={{ 
                  minWidth: 'auto',
                  padding: 0,
                  width: '20px',
                  height: '20px'
                }}
              >
                <Info size="S" />
              </ActionButton>
              <Tooltip variant="info">
                When selected, disable registration button when limit is reached.
              </Tooltip>
            </TooltipTrigger>
          </Flex>

          {/* Allow Guest Registration - ExperienceCloud Only */}
          {isExperienceCloud && (
            <Flex direction="row" alignItems="center">
              <Switch
                isSelected={allowGuestRegistration}
                onChange={handleAllowGuestRegistrationChange}
              >
                Allow guest registration
              </Switch>
              <TooltipTrigger delay={0}>
                <ActionButton 
                  isQuiet 
                  UNSAFE_style={{ 
                    minWidth: 'auto',
                    padding: 0,
                    width: '20px',
                    height: '20px'
                  }}
                >
                  <Info size="S" />
                </ActionButton>
                <Tooltip variant="info">
                  When selected, users can register for events without logging in.
                </Tooltip>
              </TooltipTrigger>
            </Flex>
          )}

          {/* Contact Host Toggle and Email Field */}
          {!(isExperienceCloud && isWebinar) && (
            <Flex direction="row" gap="size-200" alignItems="center" width="100%">
              <Flex direction="row" alignItems="center">
                <Switch
                  isSelected={contactHostEnabled}
                  onChange={handleContactHostToggle}
                >
                  Contact host
                </Switch>
                <TooltipTrigger delay={0}>
                  <ActionButton 
                    isQuiet 
                    UNSAFE_style={{ 
                      minWidth: 'auto',
                      padding: 0,
                      width: '20px',
                      height: '20px'
                    }}
                  >
                    <Info size="S" />
                  </ActionButton>
                  <Tooltip variant="info">
                    Contact host is optional.
                  </Tooltip>
                </TooltipTrigger>
              </Flex>

              {contactHostEnabled && (
                <TextField
                  type="email"
                  placeholder="Add host email"
                  value={hostEmail}
                  onChange={handleHostEmailChange}
                />
              )}
            </Flex>
          )}
        </Flex>
      </Flex>

      {/* RSVP Description */}
      <View width="100%" marginTop="size-200">
        <RichTextEditor
          label="RSVP Description (Optional)"
          value={rsvpDescription}
          onChange={handleRsvpDescriptionChange}
          height="200px"
          description="Add additional information about the RSVP process"
        />
      </View>

      {/* Registration Fields Configuration */}
      <View width="100%" marginTop="size-400">
        <RegistrationFieldsComponent
          cloudType={cloudType}
          eventType={isWebinar ? 'Virtual' : 'InPerson'}
          visibleFields={visibleRsvpFields}
          requiredFields={requiredRsvpFields}
          registrationType={registrationType}
          marketoFormUrl={marketoFormUrl}
          onVisibleFieldsChange={handleVisibleFieldsChange}
          onRequiredFieldsChange={handleRequiredFieldsChange}
          onRegistrationTypeChange={handleRegistrationTypeChange}
          onMarketoFormUrlChange={handleMarketoFormUrlChange}
        />
      </View>
    </Flex>
  )
}
