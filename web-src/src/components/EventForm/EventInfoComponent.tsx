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

// Language options for event localization
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

// Timezone options from @vvo/tzdb
const TIMEZONE_OPTIONS = getTimeZones().map((tz) => ({
  id: tz.name,
  name: `${tz.name} (${tz.currentTimeFormat})`
}))

interface EventInfoComponentProps {
  language: string
  name: string
  urlTitle: string
  description: string
  shortDescription: string
  startDateTime: string
  endDateTime: string
  timezone: string
  communityForumUrl: string
  secondaryLinkTitle: string
  onChange: (data: {
    language?: string
    name?: string
    urlTitle?: string
    description?: string
    shortDescription?: string
    startDateTime?: string
    endDateTime?: string
    timezone?: string
    communityForumUrl?: string
    secondaryLinkTitle?: string
  }) => void
}

export const EventInfoComponent: React.FC<EventInfoComponentProps> = ({
  language,
  name,
  urlTitle,
  description,
  shortDescription,
  startDateTime,
  endDateTime,
  timezone,
  communityForumUrl,
  secondaryLinkTitle,
  onChange
}) => {
  const [hasSecondaryLink, setHasSecondaryLink] = useState(false)

  // Set hasSecondaryLink based on whether we have a secondary link URL
  useEffect(() => {
    if (communityForumUrl) {
      setHasSecondaryLink(true)
    }
  }, [communityForumUrl])

  return (
    <Flex direction="column" gap="size-200">
      <Picker
        label="Language"
        isRequired
        selectedKey={language}
        onSelectionChange={(key) => onChange({ language: String(key) })}
      >
        {LANGUAGE_OPTIONS.map((lang) => (
          <Item key={lang.key}>{lang.label}</Item>
        ))}
      </Picker>

      <TextField
        label="Event Title"
        isRequired
        isQuiet
        maxLength={80}
        value={name}
        onChange={(value) => {
          // Check if old event title matches current URL title
          if (name === urlTitle) {
            // They match, so sync is active - update both fields
            onChange({ name: value, urlTitle: value })
          } else {
            // They don't match, so don't sync - only update event title
            onChange({ name: value })
          }
        }}
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
          isQuiet
          placeholder="Add event title for page URL"
          value={urlTitle || ''}
          onChange={(value) => onChange({ urlTitle: value })}
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
          onChange={(value) => onChange({ description: value })}
          height="400px"
        />
      </View>

      <TextArea
        label="Event Description for Events Hub and SEO"
        isRequired
        maxLength={160}
        value={shortDescription || ''}
        onChange={(value) => onChange({ shortDescription: value })}
        description="160 characters max"
        width="100%"
      />

      <Flex direction="row" gap="size-200" wrap>
        <DatePicker
          label="Start Date & Time"
          isRequired
          granularity="minute"
          value={startDateTime ? parseDateTime(startDateTime) : null}
          onChange={(date) => onChange({ startDateTime: date?.toString() || '' })}
        />

        <DatePicker
          label="End Date & Time"
          isRequired
          granularity="minute"
          value={endDateTime ? parseDateTime(endDateTime) : null}
          onChange={(date) => onChange({ endDateTime: date?.toString() || '' })}
          minValue={startDateTime ? parseDateTime(startDateTime) : undefined}
        />

        <ComboBox
          label="Timezone (Optional)"
          defaultItems={TIMEZONE_OPTIONS}
          selectedKey={timezone || null}
          onSelectionChange={(key) => onChange({ timezone: key ? String(key) : '' })}
          description="Search and select a timezone"
        >
          {(item) => <Item key={item.id}>{item.name}</Item>}
        </ComboBox>
      </Flex>

      <View UNSAFE_style={{ display: 'inline-block' }}>
        <Switch
          isSelected={hasSecondaryLink}
          onChange={(value) => {
            setHasSecondaryLink(value)
            if (!value) {
              // Clear fields when disabling
              onChange({ communityForumUrl: '', secondaryLinkTitle: '' })
            }
          }}
        >
          Add secondary link
        </Switch>
      </View>

      {hasSecondaryLink && (
        <>
          <TextField
            label="Secondary Link Title"
            isQuiet
            value={secondaryLinkTitle || ''}
            onChange={(value) => onChange({ secondaryLinkTitle: value })}
            description="Display text for the secondary link"
            width="100%"
          />

          <TextField
            label="Secondary Link URL"
            type="url"
            isQuiet
            value={communityForumUrl || ''}
            onChange={(value) => onChange({ communityForumUrl: value })}
            description="URL for the secondary link"
            width="100%"
          />
        </>
      )}
    </Flex>
  )
}

