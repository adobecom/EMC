/* 
* <license header>
*/

import React, { useState, useEffect, useMemo } from 'react'
import {
  ComboBox,
  ComboBoxItem,
  TextField,
  TextArea,
  Picker,
  PickerItem,
  Text,
  DatePicker,
  Switch,
  TooltipTrigger,
  Tooltip,
  DialogTrigger,
  AlertDialog,
  ActionButton,
} from '@react-spectrum/s2'
// S2 style macro for type-safe Spectrum token styling
import {style} from '@react-spectrum/s2/style' with {type: 'macro'}
import { parseDateTime, CalendarDateTime } from '@internationalized/date'
import { getTimeZones } from '@vvo/tzdb'
import InfoCircle from "@react-spectrum/s2/icons/InfoCircle"
import { HeadingWithTooltip, RichTextEditor } from '../../components/shared'
import { SPACING } from '../../styles/designSystem'
import { cachedApi } from '../../services/api'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { useGroup } from '../../contexts/GroupContext'
import { hasLocalesSlice } from '../../types/configApi'
import { SUPPORTED_SPEAKER_LOCALES, SPEAKER_LOCALE_LABELS } from '../../config/localeMapping'

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

/** Default picker entries when no scope locales config exists (aligned with ConfigManagement RSVP locales). */
const DEFAULT_LOCALE_PICKER_OPTIONS = SUPPORTED_SPEAKER_LOCALES.map((key) => ({
  key,
  label: SPEAKER_LOCALE_LABELS[key] || key,
}))

const TIMEZONE_OPTIONS = getTimeZones().map((tz) => ({
  id: tz.name,
  name: `${tz.name} (${tz.currentTimeFormat})`
}))

const EVENT_TITLE_MAX_LENGTH = 150

/**
 * EventInfoComponent - Manages core event information
 * 
 * Uses EventFormContext for state management.
 * Handles: language, name, urlTitle, description, shortDescription,
 * startDateTime, endDateTime, timezone, communityForumUrl, secondaryLinkTitle, isPrivate
 */
export const EventInfoComponent: React.FC = () => {
  const { activeGroup } = useGroup()

  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
    setLocaleAndRemapFormData,
    locale,
    isDirty,
    eventId,
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
  const [pendingLocale, setPendingLocale] = useState<string | null>(null)
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null)
  const [localeOptions, setLocaleOptions] = useState<{ key: string; label: string }[]>(DEFAULT_LOCALE_PICKER_OPTIONS)

  useEffect(() => {
    const scopeId = activeGroup?.scopeId
    if (!scopeId) {
      setLocaleOptions(DEFAULT_LOCALE_PICKER_OPTIONS)
      return
    }

    let cancelled = false
    cachedApi.getConfig(scopeId).then((result) => {
      if (cancelled) return
      if (result === null || 'error' in result) {
        setLocaleOptions(DEFAULT_LOCALE_PICKER_OPTIONS)
        return
      }
      const locales = hasLocalesSlice(result) ? result.locales : undefined
      if (locales && locales.length > 0) {
        const options = locales.map((l) => ({ key: l.code, label: l.name }))
        setLocaleOptions(options)
      } else {
        setLocaleOptions(DEFAULT_LOCALE_PICKER_OPTIONS)
      }
    }).catch(() => {
      if (!cancelled) {
        setLocaleOptions(DEFAULT_LOCALE_PICKER_OPTIONS)
      }
    })

    return () => {
      cancelled = true
    }
  }, [activeGroup?.scopeId])

  const pickerLocaleOptions = useMemo(() => {
    if (!locale) return localeOptions
    if (localeOptions.some((o) => o.key === locale)) return localeOptions
    return [{ key: locale, label: locale }, ...localeOptions]
  }, [localeOptions, locale])

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
    const nextLocale = String(key)

    if (nextLocale === locale) {
      return
    }

    if (isDirty) {
      setPendingLocale(nextLocale)
    } else {
      setLocaleAndRemapFormData(nextLocale)
    }
  }

  const handleConfirmLocaleSwitch = () => {
    if (pendingLocale) {
      setLocaleAndRemapFormData(pendingLocale)
      setPendingLocale(null)
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
      {/* Header Row */}
      <div className={style({display: 'flex', justifyContent: 'space-between', alignItems: 'center'})}>
        <HeadingWithTooltip 
          level={3}
          tooltip="Give your event a title, description, dates, and start/end times. If you have a related forum on community.adobe.com, create a CTA to it here."
        >
          Event Information
        </HeadingWithTooltip>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: SPACING.XS }}>
          <div className={style({display: 'flex', alignItems: 'center', gap: 8})}>
            <Switch
              data-testid="private-event-switch"
              isSelected={isPrivate}
              onChange={(value) => updateFormData({ isPrivate: value })}
            >
              Set as a private event
            </Switch>
            <TooltipTrigger delay={0}>
              <ActionButton
                isQuiet
              >
                <InfoCircle />
              </ActionButton>
              <Tooltip>By setting this to private, your event won&apos;t be publicly found online or published to the events hub.</Tooltip>
            </TooltipTrigger>
          </div>
          <div className={style({display: 'flex', alignItems: 'center', gap: 8})}>
            <Switch
              data-testid="invite-only-switch"
              isSelected={inviteOnly}
              onChange={(value) => updateFormData({ inviteOnly: value })}
              isDisabled={!!eventId}
            >
              Invite only
            </Switch>
            <TooltipTrigger delay={0}>
              <ActionButton
                isQuiet
              >
                <InfoCircle />
              </ActionButton>
              <Tooltip>If set to true, users can only RSVP with a campaign link.</Tooltip>
            </TooltipTrigger>
          </div>
        </div>
      </div>
      {/* Form Fields */}
      <Picker
        data-testid="language-picker"
        label="Language"
        isRequired
        selectedKey={locale || null}
        onSelectionChange={handleLanguageChange}
      >
        {pickerLocaleOptions.map((opt) => (
          <PickerItem key={opt.key} id={opt.key}>{opt.label}</PickerItem>
        ))}
      </Picker>
      {/* Locale switch confirmation when form has unsaved changes */}
      <DialogTrigger
        isOpen={!!pendingLocale}
        onOpenChange={(isOpen) => !isOpen && setPendingLocale(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Switch language?"
          variant="confirmation"
          primaryActionLabel="Switch"
          cancelLabel="Cancel"
          onPrimaryAction={() => {
            handleConfirmLocaleSwitch()
          }}
          onCancel={() => setPendingLocale(null)}
        >
          You have unsaved changes. Switching language will load the content for the selected language. Continue?
        </AlertDialog>
      </DialogTrigger>
      <TextField
        data-testid="event-title-input"
        label="Event Title"
        isRequired
        maxLength={EVENT_TITLE_MAX_LENGTH}
        value={name}
        onChange={handleNameChange}
        description={`${EVENT_TITLE_MAX_LENGTH} characters max`}
        styles={style({ width: '[100%]' })}
      />
      <div style={{ width: '100%' }}>
        <div className={style({display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8})}>
          <Text>English title for page URL</Text>
          <TooltipTrigger delay={0}>
            <ActionButton
              isQuiet
            >
              <InfoCircle />
            </ActionButton>
            <Tooltip>SEO friendly title</Tooltip>
          </TooltipTrigger>
        </div>
        <TextField
          data-testid="event-en-title-input"
          aria-label="English title for page URL"
          maxLength={EVENT_TITLE_MAX_LENGTH}
          value={enTitle || ''}
          onChange={(value) => updateFormData({ enTitle: value })}
          description={`${EVENT_TITLE_MAX_LENGTH} characters max`}
          styles={style({ width: '[100%]' })}
        />
      </div>
      <div style={{ width: '100%' }}>
        <HeadingWithTooltip 
          level={4}
          tooltip="Add rich text to your event description. This will be the copy displayed on the event page."
          marginBottomPx={8}
        >
          Event Details
        </HeadingWithTooltip>
        <RichTextEditor
          data-testid="event-description-rte"
          label=""
          value={description || ''}
          onChange={(value) => updateFormData({ description: value })}
          height="400px"
        />
      </div>
      <TextArea
        data-testid="event-seo-description"
        label="Event Description for Events Hub and SEO"
        isRequired
        maxLength={160}
        value={shortDescription || ''}
        onChange={(value) => updateFormData({ shortDescription: value })}
        description="160 characters max"
        styles={style({ width: '[100%]' })}
      />
      <div className={style({display: 'flex', gap: 16, flexWrap: 'wrap'})}>
        <DatePicker
          data-testid="start-datetime-picker"
          label="Start Date & Time"
          isRequired
          granularity="minute"
          value={safeParseDateTimeString(startDateTime)}
          onChange={(date) => updateFormData({ startDateTime: date?.toString() || '' })}
        />

        <DatePicker
          data-testid="end-datetime-picker"
          label="End Date & Time"
          isRequired
          granularity="minute"
          value={safeParseDateTimeString(endDateTime)}
          onChange={(date) => updateFormData({ endDateTime: date?.toString() || '' })}
          minValue={getMinEndDateTime(startDateTime)}
        />

        <ComboBox
          data-testid="timezone-combobox"
          label="Timezone"
          isRequired
          defaultItems={TIMEZONE_OPTIONS}
          selectedKey={timezone || null}
          onSelectionChange={(key) => updateFormData({ timezone: key ? String(key) : '' })}
          description="Search and select a timezone"
          styles={style({ width: 480 })}
          menuWidth={480}
        >
          {(item) => <ComboBoxItem id={item.id}>{item.name}</ComboBoxItem>}
        </ComboBox>
      </div>
      <div style={{ display: 'inline-block' }}>
        <Switch
          data-testid="secondary-link-switch"
          isSelected={hasSecondaryLink}
          onChange={handleSecondaryLinkToggle}
        >
          Add secondary link
        </Switch>
      </div>
      {hasSecondaryLink && (
        <>
          <TextField
            data-testid="secondary-link-title"
            label="Secondary Link Title"
            value={secondaryLinkTitle || ''}
            onChange={(value) => updateFormData({ secondaryLinkTitle: value })}
            description="Display text for the secondary link"
            styles={style({ width: '[100%]' })}
          />

          <TextField
            data-testid="secondary-link-url"
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
            isInvalid={!!urlValidationError}
            errorMessage={urlValidationError || undefined}
            description={urlValidationError ? undefined : 'URL for the secondary link'}
            styles={style({ width: '[100%]' })}
          />
        </>
      )}
    </div>
  )
}
