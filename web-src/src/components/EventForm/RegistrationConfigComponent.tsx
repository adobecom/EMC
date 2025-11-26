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

interface RegistrationConfigComponentProps {
  cloudType: 'CreativeCloud' | 'ExperienceCloud'
  venueName?: string
  capacity?: number
  allowWaitlist?: boolean
  allowGuestRegistration?: boolean
  hostEmail?: string
  rsvpDescription?: string
  registrationType?: 'ESP' | 'Marketo'
  marketoFormUrl?: string
  visibleRsvpFields?: string[]
  requiredRsvpFields?: string[]
  onCapacityChange: (value: number) => void
  onAllowWaitlistChange: (value: boolean) => void
  onAllowGuestRegistrationChange: (value: boolean) => void
  onHostEmailChange: (value: string) => void
  onRsvpDescriptionChange: (value: string) => void
  onRegistrationTypeChange: (type: 'ESP' | 'Marketo') => void
  onMarketoFormUrlChange: (url: string) => void
  onVisibleFieldsChange: (fields: string[]) => void
  onRequiredFieldsChange: (fields: string[]) => void
}

export const RegistrationConfigComponent: React.FC<RegistrationConfigComponentProps> = ({
  cloudType,
  venueName,
  capacity = 0,
  allowWaitlist = false,
  allowGuestRegistration = false,
  hostEmail = '',
  rsvpDescription = '',
  registrationType = 'ESP',
  marketoFormUrl = '',
  visibleRsvpFields = [],
  requiredRsvpFields = [],
  onCapacityChange,
  onAllowWaitlistChange,
  onAllowGuestRegistrationChange,
  onHostEmailChange,
  onRsvpDescriptionChange,
  onRegistrationTypeChange,
  onMarketoFormUrlChange,
  onVisibleFieldsChange,
  onRequiredFieldsChange
}) => {
  const [contactHostEnabled, setContactHostEnabled] = useState(!!hostEmail)

  // Sync contactHostEnabled when hostEmail prop changes from outside
  useEffect(() => {
    setContactHostEnabled(!!hostEmail)
  }, [hostEmail])

  const isCreativeCloud = cloudType === 'CreativeCloud'
  const isExperienceCloud = cloudType === 'ExperienceCloud'
  const isWebinar = venueName === 'Webinar'

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
            value={capacity}
            onChange={onCapacityChange}
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
              onChange={(value) => onAllowWaitlistChange(!value)}
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
            <Flex direction="row" gap="size-100" alignItems="center">
              <Switch
                isSelected={allowGuestRegistration}
                onChange={onAllowGuestRegistrationChange}
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

          {/* Contact Host Toggle and Email Field - Hide for ExperienceCloud Webinars */}
          {!(isExperienceCloud && isWebinar) && (
            <Flex direction="row" gap="size-200" alignItems="center" width="100%">
              <Flex direction="row" gap="size-100" alignItems="center">
                <Switch
                  isSelected={contactHostEnabled}
                  onChange={(value) => {
                    setContactHostEnabled(value)
                    if (!value) {
                      onHostEmailChange('')
                    }
                  }}
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

              {/* Host Email Field - Show when Contact Host is enabled */}
              {contactHostEnabled && (
                <TextField
                  type="email"
                  placeholder="Add host email"
                  value={hostEmail}
                  onChange={onHostEmailChange}
                  width="100%"
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
          onChange={onRsvpDescriptionChange}
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
          onVisibleFieldsChange={onVisibleFieldsChange}
          onRequiredFieldsChange={onRequiredFieldsChange}
          onRegistrationTypeChange={onRegistrationTypeChange}
          onMarketoFormUrlChange={onMarketoFormUrlChange}
        />
      </View>
    </Flex>
  )
}

