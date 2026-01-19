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
  ActionButton,
  ComboBox
} from '@adobe/react-spectrum'
import { parseDateTime, CalendarDateTime } from '@internationalized/date'
import Info from '@spectrum-icons/workflow/Info'
import { HeadingWithTooltip, RichTextEditor } from '../../components/shared'
import { FLEX_GAP } from '../../styles/designSystem'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { EVENT_FORM_LIMITS, EVENT_FORM_OPTIONS } from '../../config/uiConstants'
import { TIMEZONE_OPTIONS } from '../../config/timezoneOptions'

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
  } = useEventFormComponent({
    componentId: 'event-info',
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
  } = formData
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [hasSecondaryLink, setHasSecondaryLink] = useState(false)

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
              UNSAFE_style={{ 
                minWidth: 'auto',
                padding: 0,
                width: '20px',
                height: '20px'
              }}
            >
              <Info size="S" />
            </ActionButton>
            <Tooltip variant="info">By setting this to private, your event won't be publicly found online or published to the events hub.</Tooltip>
          </TooltipTrigger>
        </Flex>
      </Flex>

      {/* Form Fields */}
      <Picker
        label="Language"
        isRequired
        selectedKey={language}
        onSelectionChange={(key) => updateFormData({ language: String(key) })}
      >
        {EVENT_FORM_OPTIONS.languages.map((lang) => (
          <Item key={lang.key}>{lang.label}</Item>
        ))}
      </Picker>

      <TextField
        label="Event Title"
        isRequired
        maxLength={EVENT_FORM_LIMITS.eventTitleMaxLength}
        value={name}
        onChange={handleNameChange}
        description={`${EVENT_FORM_LIMITS.eventTitleMaxLength} characters max`}
        width="100%"
      />

      <View width="100%">
        <Flex direction="row" gap="size-100" alignItems="center" marginBottom="size-100">
          <Text>English title for page URL</Text>
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
        maxLength={EVENT_FORM_LIMITS.shortDescriptionMaxLength}
        value={shortDescription || ''}
        onChange={(value) => updateFormData({ shortDescription: value })}
        description={`${EVENT_FORM_LIMITS.shortDescriptionMaxLength} characters max`}
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
            onChange={(value) => updateFormData({ communityForumUrl: value })}
            description="URL for the secondary link"
            width="100%"
          />
        </>
      )}
    </Flex>
  )
}
