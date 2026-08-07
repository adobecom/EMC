/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  TextField,
  NumberField,
  Switch,
  Text,
  TooltipTrigger,
  Tooltip,
  ActionButton,
} from '@react-spectrum/s2'
// S2 style macro for type-safe Spectrum token styling
import {style} from '@react-spectrum/s2/style' with {type: 'macro'}
import { HeadingWithTooltip, RichTextEditor } from '../../components/shared'
import InfoCircle from "@react-spectrum/s2/icons/InfoCircle"
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
  const attendeeLimit = formData.attendeeLimit ?? 0
  const allowWaitlist = formData.allowWaitlist ?? false
  const allowGuestRegistration = formData.allowGuestRegistration ?? false
  const closeRegistration = formData.closeRegistration ?? false
  const hostEmail = formData.hostEmail || ''
  const rsvpDescription = formData.rsvpDescription || ''
  const registrationType = formData.registrationType || 'ESP'
  const marketoFormUrl = formData.marketoFormUrl || ''
  const rsvpFormFields = formData.rsvpFormFields || []
  
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
  const isWebinar = formData.eventType === 'webinar'

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
  
  const handleRsvpFormFieldsChange = (fields: { field: string; required?: boolean; options?: string[] }[]) => {
    updateFormData({ rsvpFormFields: fields })
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
    <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
      <HeadingWithTooltip
        level={3}
        tooltip={
          isCreativeCloud
            ? 'Optionally enable email links to the host or add a description to the RSVP process for your attendees.'
            : 'DX events are waitlist only. Call-to-action buttons will only allow waitlisting.'
        }
      >
        RSVP Configuration
      </HeadingWithTooltip>
      <div className={style({display: 'flex', gap: 32, alignItems: 'start'})}>
        {/* Left: Attendee Limit Input */}
        <div>
          <div className={style({display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8})}>
            <Text UNSAFE_style={{ fontWeight: 'bold' }}>Attendee limit</Text>
            <TooltipTrigger delay={0}>
              <ActionButton
                isQuiet
              >
                <InfoCircle />
              </ActionButton>
              <Tooltip>When no limit is set, all users will be admitted into event.</Tooltip>
            </TooltipTrigger>
          </div>
          <NumberField
            data-testid="attendee-limit-input"
            value={attendeeLimit}
            onChange={handleAttendeeLimitChange}
            minValue={0}
            hideStepper
            styles={style({ width: 160 })}
          />
        </div>

        {/* Right: All Toggles Container */}
        <div className={style({display: 'flex', flexDirection: 'column', gap: 12, flexGrow: 1})}>
          {/* Disable Waitlist Toggle */}
          <div className={style({display: 'flex', gap: 8, alignItems: 'center'})}>
            <Switch
              data-testid="allow-waitlist-switch"
              isSelected={!allowWaitlist}
              onChange={(value) => handleAllowWaitlistChange(!value)}
            >
              When limit is reached, disable registration button
            </Switch>
            <TooltipTrigger delay={0}>
              <ActionButton
                isQuiet
              >
                <InfoCircle />
              </ActionButton>
              <Tooltip>
                When selected, disable registration button when limit is reached.
              </Tooltip>
            </TooltipTrigger>
          </div>

          {/* Allow Guest Registration - ExperienceCloud Only */}
          {isExperienceCloud && (
            <div className={style({display: 'flex', alignItems: 'center'})}>
              <Switch
                data-testid="allow-guest-switch"
                isSelected={allowGuestRegistration}
                onChange={handleAllowGuestRegistrationChange}
              >
                Allow guest registration
              </Switch>
              <TooltipTrigger delay={0}>
                <ActionButton
                  isQuiet
                  
                >
                  <InfoCircle />
                </ActionButton>
                <Tooltip>
                  When selected, users can register for events without logging in.
                </Tooltip>
              </TooltipTrigger>
            </div>
          )}

          {/* Close Registration Toggle */}
          <div className={style({display: 'flex', gap: 8, alignItems: 'center'})}>
            <Switch
              data-testid="close-registration-switch"
              isSelected={closeRegistration}
              onChange={(value) => updateFormData({ closeRegistration: value })}
            >
              Close registration
            </Switch>
            <TooltipTrigger delay={0}>
              <ActionButton isQuiet>
                <InfoCircle />
              </ActionButton>
              <Tooltip>
                When selected, registration is closed and the CTA will display &quot;Registration is closed.&quot;
              </Tooltip>
            </TooltipTrigger>
          </div>

          {/* Contact Host Toggle and Email Field */}
          {!(isExperienceCloud && isWebinar) && (
            <div className={style({display: 'flex', gap: 16, alignItems: 'center', width: '[100%]'})}>
              <div className={style({display: 'flex', alignItems: 'center'})}>
                <Switch
                  data-testid="contact-host-switch"
                  isSelected={contactHostEnabled}
                  onChange={handleContactHostToggle}
                >
                  Contact host
                </Switch>
                <TooltipTrigger delay={0}>
                  <ActionButton
                    isQuiet
                    
                  >
                    <InfoCircle />
                  </ActionButton>
                  <Tooltip>
                    Contact host is optional.
                  </Tooltip>
                </TooltipTrigger>
              </div>

              {contactHostEnabled && (
                <TextField
                  data-testid="host-email-input"
                  type="email"
                  placeholder="Add host email"
                  value={hostEmail}
                  onChange={handleHostEmailChange}
                />
              )}
            </div>
          )}
        </div>
      </div>
      {/* RSVP Description */}
      <div data-testid="rsvp-description-rte" style={{ width: '100%', marginTop: 16 }}>
        <RichTextEditor
          label="RSVP Description (Optional)"
          value={rsvpDescription}
          onChange={handleRsvpDescriptionChange}
          height="200px"
          description="Add additional information about the RSVP process"
        />
      </div>
      {/* Registration Fields Configuration */}
      <div style={{ width: '100%', marginTop: 32 }}>
        <RegistrationFieldsComponent
          isExperienceCloud={isExperienceCloud}
          eventType={isWebinar ? 'Virtual' : 'InPerson'}
          cloudType={cloudType}
          rsvpFormFields={rsvpFormFields}
          registrationType={registrationType}
          marketoFormUrl={marketoFormUrl}
          onRsvpFormFieldsChange={handleRsvpFormFieldsChange}
          onRegistrationTypeChange={handleRegistrationTypeChange}
          onMarketoFormUrlChange={handleMarketoFormUrlChange}
        />
      </div>
    </div>
  )
}
