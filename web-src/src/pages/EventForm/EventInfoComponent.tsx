/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  TextField,
  TextArea,
  Picker,
  Item,
  DatePicker,
  Flex,
  Text,
  Switch,
  TooltipTrigger,
  Tooltip,
  ComboBox,
  DialogTrigger,
  AlertDialog,
} from '@adobe/react-spectrum'
import { ActionButton } from "@react-spectrum/s2"
// S2 style macro for type-safe Spectrum token styling
import {style} from '@react-spectrum/s2/style' with {type: 'macro'}
import { parseDateTime, CalendarDateTime } from '@internationalized/date'
import { getTimeZones } from '@vvo/tzdb'
import InfoCircle from "@react-spectrum/s2/icons/InfoCircle"
import { HeadingWithTooltip, RichTextEditor } from '../../components/shared'
import { FLEX_GAP, SPACING } from '../../styles/designSystem'
import { LANGUAGE_TO_LOCALE, DEFAULT_LOCALE } from '../../config/localeMapping'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'

/**
 * Safely parse ISO 8601 datetime string for DatePicker
 */
function safeParseDateTimeString(dateString: string | undefined | null): CalendarDateTime | null {
  if (!dateString) return null
  
  try {
    const cleaned = dateString
      .replace(/\.\d{3}Z?$/, '')
      .replace(/[+-]\d{2}:\d{2}$/, '')
    
    return parseDateTime(cleaned)
  } catch (error) {
    console.error('Failed to parse datetime:', dateString, error)
    return null
  }
}

/**
 * Add minutes to a CalendarDateTime
 * Returns a new CalendarDateTime with the added minutes
 */
function addMinutes(dt: CalendarDateTime, minutes: number): CalendarDateTime {
  let newMinute = dt.minute + minutes
  let newHour = dt.hour
  let newDay = dt.day
  let newMonth = dt.month
  let newYear = dt.year
  
  // Handle minute overflow
  while (newMinute >= 60) {
    newMinute -= 60
    newHour += 1
  }
  while (newMinute < 0) {
    newMinute += 60
    newHour -= 1
  }
  
  // Handle hour overflow
  while (newHour >= 24) {
    newHour -= 24
    newDay += 1
  }
  while (newHour < 0) {
    newHour += 24
    newDay -= 1
  }
  
  // For simplicity, handle day overflow approximately (doesn't need to be perfect for +1 minute)
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  // Adjust for leap years
  if ((newYear % 4 === 0 && newYear % 100 !== 0) || newYear % 400 === 0) {
    daysInMonth[2] = 29
  }
  
  while (newDay > daysInMonth[newMonth]) {
    newDay -= daysInMonth[newMonth]
    newMonth += 1
    if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    }
  }
  
  return new CalendarDateTime(newYear, newMonth, newDay, newHour, newMinute, dt.second || 0)
}

/**
 * Get minimum end datetime (start + 1 minute) to ensure positive duration
 */
function getMinEndDateTime(startDateTimeStr: string): CalendarDateTime | undefined {
  const startDt = safeParseDateTimeString(startDateTimeStr)
  if (!startDt) return undefined
  return addMinutes(startDt, 1)
}

const LANGUAGE_OPTIONS = [
  { key: 'en', label: 'English' },
  { key: 'es', label: 'Spanish' },
  { key: 'fr', label: 'French' },
  { key: 'de', label: 'German' },
  { key: 'ja', label: 'Japanese' },
  { key: 'ko', label: 'Korean' },
  { key: 'pt', label: 'Portuguese' },
  { key: 'zh', label: 'Chinese' }
]

const TIMEZONE_OPTIONS = getTimeZones().map((tz) => ({
  id: tz.name,
  name: `${tz.name} (${tz.currentTimeFormat})`
}))

/**
 * EventInfoComponent - Manages core event information
 * 
 * Uses EventFormContext for state management.
 * Handles: language, name, urlTitle, description, shortDescription,
 * startDateTime, endDateTime, timezone, communityForumUrl, secondaryLinkTitle, isPrivate
 */
export const EventInfoComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
    setLocaleAndRemapFormData,
    isDirty,
  } = useEventFormComponent({
    componentId: 'event-info',
    validate: () => {
      const url = formData.communityForumUrl
      if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
        return 'Secondary Link URL must start with https://'
      }
      return true
    },
  })
  
  // Destructure form data
  const {
    language = 'en',
    name = '',
    enTitle = '',
    description = '',
    shortDescription = '',
    startDateTime = '',
    endDateTime = '',
    timezone = '',
    communityForumUrl = '',
    secondaryLinkTitle = '',
    isPrivate = false,
    inviteOnly = false,
  } = formData
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [hasSecondaryLink, setHasSecondaryLink] = useState(false)
  const [pendingLanguageKey, setPendingLanguageKey] = useState<string | null>(null)
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (communityForumUrl) {
      setHasSecondaryLink(true)
    }
  }, [communityForumUrl])
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleNameChange = (value: string) => {
    // Sync enTitle and urlTitle if they currently match the name
    // (i.e., they haven't been manually customized yet)
    const shouldSyncEnTitle = name === enTitle || !enTitle
    const shouldSyncUrlTitle = name === (formData.urlTitle || '') || !formData.urlTitle
    
    const updates: Partial<typeof formData> = { name: value }
    
    if (shouldSyncEnTitle) {
      updates.enTitle = value
    }
    
    if (shouldSyncUrlTitle) {
      updates.urlTitle = value
    }
    
    updateFormData(updates)
  }
  
  const handleSecondaryLinkToggle = (value: boolean) => {
    setHasSecondaryLink(value)
    if (!value) {
      updateFormData({ communityForumUrl: '', secondaryLinkTitle: '' })
    }
  }

  const handleLanguageChange = (key: React.Key | null) => {
    if (key == null) return
    const languageKey = String(key)
    const locale = LANGUAGE_TO_LOCALE[languageKey] || DEFAULT_LOCALE

    if (isDirty) {
      setPendingLanguageKey(languageKey)
    } else {
      setLocaleAndRemapFormData(locale)
    }
  }

  const handleConfirmLocaleSwitch = () => {
    if (pendingLanguageKey) {
      const locale = LANGUAGE_TO_LOCALE[pendingLanguageKey] || DEFAULT_LOCALE
      setLocaleAndRemapFormData(locale)
      setPendingLanguageKey(null)
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap={FLEX_GAP.SECTION}>
      {/* Header Row */}
      <Flex direction="row" justifyContent="space-between" alignItems="center">
        <HeadingWithTooltip 
          level={3}
          tooltip="Give your event a title, description, dates, and start/end times. If you have a related forum on community.adobe.com, create a CTA to it here."
        >
          Event Information
        </HeadingWithTooltip>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: SPACING.XS }}>
          <Flex direction="row" alignItems="center" gap="size-100">
            <Switch
              isSelected={isPrivate}
              onChange={(value) => updateFormData({ isPrivate: value })}
            >
              Set as a private event
            </Switch>
            <TooltipTrigger delay={0}>
              <ActionButton 
                isQuiet
                styles={style({minWidth: 0, width: 20})}
              >
                <InfoCircle />
              </ActionButton>
              <Tooltip variant="info">By setting this to private, your event won't be publicly found online or published to the events hub.</Tooltip>
            </TooltipTrigger>
          </Flex>
          <Flex direction="row" alignItems="center" gap="size-100">
            <Switch
              isSelected={inviteOnly}
              onChange={(value) => updateFormData({ inviteOnly: value })}
            >
              Invite only
            </Switch>
            <TooltipTrigger delay={0}>
              <ActionButton 
                isQuiet
                styles={style({minWidth: 0, width: 20})}
              >
                <InfoCircle />
              </ActionButton>
              <Tooltip variant="info">If set to true, users can only RSVP with a campaign link.</Tooltip>
            </TooltipTrigger>
          </Flex>
        </div>
      </Flex>
      {/* Form Fields */}
      <Picker
        label="Language"
        isRequired
        selectedKey={language}
        onSelectionChange={handleLanguageChange}
      >
        {LANGUAGE_OPTIONS.map((lang) => (
          <Item key={lang.key}>{lang.label}</Item>
        ))}
      </Picker>
      {/* Locale switch confirmation when form has unsaved changes */}
      <DialogTrigger
        isOpen={!!pendingLanguageKey}
        onOpenChange={(isOpen) => !isOpen && setPendingLanguageKey(null)}
      >
        <div style={{ display: 'none' }} />
        {(close) => (
          <AlertDialog
            title="Switch language?"
            variant="confirmation"
            primaryActionLabel="Switch"
            secondaryActionLabel="Cancel"
            onPrimaryAction={() => {
              handleConfirmLocaleSwitch()
              close()
            }}
            onSecondaryAction={close}
          >
            You have unsaved changes. Switching language will load the content for the selected language. Continue?
          </AlertDialog>
        )}
      </DialogTrigger>
      <TextField
        label="Event Title"
        isRequired
        maxLength={80}
        value={name}
        onChange={handleNameChange}
        description="80 characters max"
        width="100%"
      />
      <View width="100%">
        <Flex direction="row" gap="size-100" alignItems="center" marginBottom="size-100">
          <Text>English title for page URL</Text>
          <TooltipTrigger delay={0}>
            <ActionButton 
              isQuiet 
              styles={style({minWidth: 0, width: 20})}
            >
              <InfoCircle />
            </ActionButton>
            <Tooltip variant="info">SEO friendly title</Tooltip>
          </TooltipTrigger>
        </Flex>
        <TextField
          aria-label="English title for page URL"
          value={enTitle || ''}
          onChange={(value) => updateFormData({ enTitle: value })}
          width="100%"
        />
      </View>
      <View width="100%">
        <HeadingWithTooltip 
          level={4}
          tooltip="Add rich text to your event description. This will be the copy displayed on the event page."
          marginBottom="size-100"
        >
          Event Details
        </HeadingWithTooltip>
        <RichTextEditor
          label=""
          value={description || ''}
          onChange={(value) => updateFormData({ description: value })}
          height="400px"
        />
      </View>
      <TextArea
        label="Event Description for Events Hub and SEO"
        isRequired
        maxLength={160}
        value={shortDescription || ''}
        onChange={(value) => updateFormData({ shortDescription: value })}
        description="160 characters max"
        width="100%"
      />
      <Flex direction="row" gap="size-200" wrap>
        <DatePicker
          label="Start Date & Time"
          isRequired
          granularity="minute"
          value={safeParseDateTimeString(startDateTime)}
          onChange={(date) => updateFormData({ startDateTime: date?.toString() || '' })}
        />

        <DatePicker
          label="End Date & Time"
          isRequired
          granularity="minute"
          value={safeParseDateTimeString(endDateTime)}
          onChange={(date) => updateFormData({ endDateTime: date?.toString() || '' })}
          minValue={getMinEndDateTime(startDateTime)}
        />

        <ComboBox
          label="Timezone"
          isRequired
          defaultItems={TIMEZONE_OPTIONS}
          selectedKey={timezone || null}
          onSelectionChange={(key) => updateFormData({ timezone: key ? String(key) : '' })}
          description="Search and select a timezone"
          width="size-6000"
          menuWidth="size-6000"
        >
          {(item) => <Item key={item.id}>{item.name}</Item>}
        </ComboBox>
      </Flex>
      <View UNSAFE_style={{ display: 'inline-block' }}>
        <Switch
          isSelected={hasSecondaryLink}
          onChange={handleSecondaryLinkToggle}
        >
          Add secondary link
        </Switch>
      </View>
      {hasSecondaryLink && (
        <>
          <TextField
            label="Secondary Link Title"
            value={secondaryLinkTitle || ''}
            onChange={(value) => updateFormData({ secondaryLinkTitle: value })}
            description="Display text for the secondary link"
            width="100%"
          />

          <TextField
            label="Secondary Link URL"
            type="url"
            value={communityForumUrl || ''}
            onChange={(value) => {
              updateFormData({ communityForumUrl: value })
              if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                setUrlValidationError('URL must start with https://')
              } else {
                setUrlValidationError(null)
              }
            }}
            validationState={urlValidationError ? 'invalid' : undefined}
            errorMessage={urlValidationError}
            description={urlValidationError ? undefined : 'URL for the secondary link'}
            width="100%"
          />
        </>
      )}
    </Flex>
  )
}
