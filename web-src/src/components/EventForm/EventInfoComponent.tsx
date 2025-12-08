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
import { parseDateTime } from '@internationalized/date'
import { getTimeZones } from '@vvo/tzdb'
import Info from '@spectrum-icons/workflow/Info'
import { HeadingWithTooltip, RichTextEditor } from '../shared'
import { FLEX_GAP } from '../../styles/designSystem'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'

/**
 * Safely parse ISO 8601 datetime string for DatePicker
 */
function safeParseDateTimeString(dateString: string | undefined | null) {
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
  } = useEventFormComponent({
    componentId: 'event-info',
  })
  
  // Destructure form data
  const {
    language = 'en',
    name = '',
    urlTitle = '',
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
    // Sync URL title if they match
    if (name === urlTitle) {
      updateFormData({ name: value, urlTitle: value })
    } else {
      updateFormData({ name: value })
    }
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
        {LANGUAGE_OPTIONS.map((lang) => (
          <Item key={lang.key}>{lang.label}</Item>
        ))}
      </Picker>

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
          value={urlTitle || ''}
          onChange={(value) => updateFormData({ urlTitle: value })}
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
          minValue={safeParseDateTimeString(startDateTime) || undefined}
        />

        <ComboBox
          label="Timezone (Optional)"
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
