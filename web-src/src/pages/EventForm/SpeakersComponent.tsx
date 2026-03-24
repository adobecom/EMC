/* 
* <license header>
*/

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  ActionButton,
  ProgressCircle,
  TooltipTrigger,
  Tooltip,
} from '@adobe/react-spectrum'
import { Button, Heading, Text, Picker, PickerItem } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { ProfileData, SeriesSpeaker, SpeakerType, EventApiResponse } from '../../types/domain'
import { SpeakerPickerDialog } from './SpeakerPickerDialog'
import { TYPOGRAPHY, COLORS } from '../../styles/designSystem'
import { speakerHasLocalization } from '../../utils/eventFormMappers'
import Add from '@spectrum-icons/workflow/Add'
import Alert from '@spectrum-icons/workflow/Alert'
import Delete from '@spectrum-icons/workflow/Delete'
import DragHandle from '@spectrum-icons/workflow/DragHandle'
import { apiService, cachedApi } from '../../services/api'
import { useToast } from '../../contexts'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'

const SPEAKER_TYPE_OPTIONS: { key: SpeakerType; label: string }[] = [
  { key: 'host', label: 'Host' },
  { key: 'presenter', label: 'Presenter' },
  { key: 'speaker', label: 'Speaker' },
  { key: 'guest-speaker', label: 'Guest Speaker' },
  { key: 'keynote', label: 'Keynote' },
  { key: 'judge', label: 'Judge' },
  { key: 'portfolio-reviewer', label: 'Portfolio Reviewer' },
  { key: 'career-advisor', label: 'Career Advisor' },
  { key: 'product-demonstrator', label: 'Product Demonstrator' },
]

/**
 * Convert kebab-case speaker type to PascalCase for API
 */
function toApiSpeakerType(type: SpeakerType | string): string {
  const typeMap: Record<string, string> = {
    'host': 'Host',
    'presenter': 'Presenter',
    'speaker': 'Speaker',
    'guest-speaker': 'GuestSpeaker',
    'keynote': 'Keynote',
    'judge': 'Judge',
    'portfolio-reviewer': 'PortfolioReviewer',
    'career-advisor': 'CareerAdvisor',
    'product-demonstrator': 'ProductDemonstrator',
    'Host': 'Host',
    'Presenter': 'Presenter',
    'Speaker': 'Speaker',
    'GuestSpeaker': 'GuestSpeaker',
    'Keynote': 'Keynote',
    'Judge': 'Judge',
    'PortfolioReviewer': 'PortfolioReviewer',
    'CareerAdvisor': 'CareerAdvisor',
    'ProductDemonstrator': 'ProductDemonstrator',
  }
  return typeMap[type] || 'Speaker'
}

/**
 * Convert SeriesSpeaker to ProfileData for form state
 */
function seriesSpeakerToProfileData(speaker: SeriesSpeaker, locale: string): ProfileData {
  const title = speaker.localizations?.[locale]?.title ?? speaker.title ?? ''
  const bio = speaker.localizations?.[locale]?.bio ?? speaker.bio ?? ''

  return {
    type: 'speaker',
    speakerId: speaker.speakerId,
    firstName: speaker.firstName,
    lastName: speaker.lastName,
    title,
    bio: bio || undefined,
    imageUrl: speaker.photo?.imageUrl,
    imageId: speaker.photo?.imageId,
    socialLinks: speaker.socialLinks?.map(link => ({ url: link.link, platform: link.serviceName })) ?? [],
    isFromSeries: true,
    isSaved: true,
    modificationTime: speaker.modificationTime,
  }
}

/**
 * SpeakersComponent - Readonly repeater of speakers with role-only editing.
 * Add speakers via Speaker Picker modal (search/select or create new).
 * Event-level speaker association is handled in onAfterSave.
 */
export const SpeakersComponent: React.FC = () => {
  const profilesRef = useRef<ProfileData[]>([])
  const toast = useToast()

  const {
    formData,
    updateFormData,
    seriesId: contextSeriesId,
    locale,
  } = useEventFormComponent({
    componentId: 'speakers',

    validate: () => {
      const profiles = formData.profiles || []
      const missing = profiles.filter(p => {
        if (!p.isFromSeries || !p.speakerId) return false
        const speaker = seriesSpeakers.find(s => s.speakerId === p.speakerId)
        return !speaker || !speakerHasLocalization(speaker, locale)
      })
      if (missing.length > 0) {
        const names = missing.map(p => `${p.firstName} ${p.lastName}`).join(', ')
        return `The following speakers are missing a localized title for ${locale}: ${names}. Please update their title.`
      }
      return true
    },

    onAfterSave: async (savedEventId: string, _eventResponse: EventApiResponse) => {
      const profiles = profilesRef.current
      const failedSpeakerIds = new Set<string>()

      let savedSpeakers: any[] = []
      try {
        const speakersResponse = await cachedApi.getEventSpeakers(savedEventId)
        if (speakersResponse && !('error' in speakersResponse)) {
          savedSpeakers = speakersResponse.speakers || speakersResponse || []
          if (!Array.isArray(savedSpeakers)) {
            savedSpeakers = []
          }
        }
      } catch (err) {
        console.error('Failed to fetch event speakers:', err)
        toast.error('Failed to load event speakers.')
        return
      }

      const currentSpeakers = profiles
        .filter(p => p.speakerId && p.isSaved)
        .map((p, index) => ({
          speakerId: p.speakerId!,
          speakerType: toApiSpeakerType(p.type),
          ordinal: index,
        }))

      if (currentSpeakers.length === 0 && savedSpeakers.length > 0) {
        await Promise.all(
          savedSpeakers.map(async (speaker: any) => {
            const result = await apiService.removeSpeakerFromEvent(speaker.speakerId, savedEventId)
            if ('error' in result) {
              console.error(`Failed to remove speaker ${speaker.speakerId} from event:`, result)
              failedSpeakerIds.add(speaker.speakerId)
            }
          })
        )
      } else {
        await Promise.all(
          currentSpeakers.map(async (eventSpeaker) => {
            if (!eventSpeaker.speakerId) return

            if (savedSpeakers.length === 0) {
              const result = await apiService.addSpeakerToEvent(eventSpeaker, savedEventId)
              if ('error' in result) {
                console.error(`Failed to add speaker ${eventSpeaker.speakerId} to event:`, result)
                failedSpeakerIds.add(eventSpeaker.speakerId)
              }
            } else {
              const existingSpeaker = savedSpeakers.find((saved: any) => {
                return (
                  saved.speakerId === eventSpeaker.speakerId &&
                  saved.speakerType === eventSpeaker.speakerType &&
                  saved.ordinal === eventSpeaker.ordinal
                )
              })

              if (!existingSpeaker) {
                const speakerToUpdate = savedSpeakers.find((saved: any) =>
                  saved.speakerId === eventSpeaker.speakerId
                )

                if (speakerToUpdate) {
                  const result = await apiService.updateSpeakerInEvent(
                    eventSpeaker,
                    eventSpeaker.speakerId,
                    savedEventId
                  )
                  if ('error' in result) {
                    console.error(`Failed to update speaker ${eventSpeaker.speakerId} in event:`, result)
                    failedSpeakerIds.add(eventSpeaker.speakerId)
                  }
                } else {
                  const result = await apiService.addSpeakerToEvent(eventSpeaker, savedEventId)
                  if ('error' in result) {
                    console.error(`Failed to add speaker ${eventSpeaker.speakerId} to event:`, result)
                    failedSpeakerIds.add(eventSpeaker.speakerId)
                  }
                }
              }
            }
          })
        )
      }

      if (savedSpeakers.length > 0) {
        await Promise.all(
          savedSpeakers.map(async (savedSpeaker: any) => {
            const stillNeeded = currentSpeakers.find(p => p.speakerId === savedSpeaker.speakerId)
            if (!stillNeeded) {
              const result = await apiService.removeSpeakerFromEvent(savedSpeaker.speakerId, savedEventId)
              if ('error' in result) {
                console.error(`Failed to remove speaker ${savedSpeaker.speakerId} from event:`, result)
                failedSpeakerIds.add(savedSpeaker.speakerId)
              }
            }
          })
        )
      }

      if (failedSpeakerIds.size > 0) {
        const names = profiles
          .filter(p => p.speakerId && failedSpeakerIds.has(p.speakerId))
          .map(p => `${p.firstName} ${p.lastName}`.trim() || p.speakerId)
        const nameList = names.length > 0 ? names.join(', ') : Array.from(failedSpeakerIds).join(', ')
        toast.error(`Failed to update speakers for this event: ${nameList}. Please try again.`)
      }
    },
  })

  const profiles = formData.profiles || []

  useEffect(() => {
    profilesRef.current = profiles
  }, [profiles])

  const [seriesSpeakers, setSeriesSpeakers] = useState<SeriesSpeaker[]>([])
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Use formData.seriesId when context seriesId is empty (e.g. when editing a loaded event)
  const seriesId = contextSeriesId || formData.seriesId || ''

  useEffect(() => {
    if (!seriesId) return

    let isMounted = true

    const loadSeriesSpeakers = async () => {
      setIsLoadingSpeakers(true)
      try {
        const response = await cachedApi.getSpeakers(seriesId)
        if (isMounted && response && !('error' in response)) {
          const speakers = response.speakers || response || []
          setSeriesSpeakers(Array.isArray(speakers) ? speakers : [])
        }
      } catch (err) {
        console.error('Failed to load series speakers:', err)
      } finally {
        if (isMounted) {
          setIsLoadingSpeakers(false)
        }
      }
    }

    loadSeriesSpeakers()

    return () => {
      isMounted = false
    }
  }, [seriesId])

  const selectedSpeakerIds = new Set(profiles.map(p => p.speakerId).filter(Boolean) as string[])

  const refreshSeriesSpeakers = useCallback(async () => {
    if (!seriesId) return
    const response = await cachedApi.getSpeakers(seriesId)
    if (response && !('error' in response)) {
      const speakers = response.speakers || response || []
      setSeriesSpeakers(Array.isArray(speakers) ? speakers : [])
    }
  }, [seriesId])

  const handlePickerSelect = useCallback(
    (speaker: SeriesSpeaker) => {
      const newProfile = seriesSpeakerToProfileData(speaker, locale)
      updateFormData({ profiles: [...profiles, newProfile] })
      setPickerOpen(false)
    },
    [profiles, locale, updateFormData]
  )

  const removeProfile = useCallback(
    (index: number) => {
      updateFormData({ profiles: profiles.filter((_, i) => i !== index) })
    },
    [profiles, updateFormData]
  )

  const updateProfile = useCallback(
    (index: number, updates: Partial<ProfileData>) => {
      const updated = [...profiles]
      updated[index] = { ...updated[index], ...updates }
      updateFormData({ profiles: updated })
    },
    [profiles, updateFormData]
  )

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newProfiles = [...profiles]
    const [draggedItem] = newProfiles.splice(draggedIndex, 1)
    newProfiles.splice(dropIndex, 0, draggedItem)
    updateFormData({ profiles: newProfiles })

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
      <div className={style({display: 'flex', alignItems: 'center', gap: 12})}>
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>
          Speakers & Hosts
        </Heading>
        {isLoadingSpeakers && (
          <ProgressCircle size="S" isIndeterminate aria-label="Loading speakers" />
        )}
      </div>

      <Text>
        Add speaker and event host details. Drag to reorder. You can change each speaker&apos;s role for this event.
      </Text>

      {profiles.length === 0 && (
        <View
          padding="size-400"
          backgroundColor="gray-100"
          borderRadius="medium"
          UNSAFE_style={{ textAlign: 'center' }}
        >
          <div className={style({display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16})}>
            <Text>Add speakers to your event using the button below.</Text>
            <Button variant="secondary" onPress={() => setPickerOpen(true)}>
              <Add />
              <Text>Add Speaker</Text>
            </Button>
          </div>
        </View>
      )}

      {profiles.map((profile, index) => {
        const displayName =
          profile.firstName && profile.lastName
            ? `${profile.firstName} ${profile.lastName}`
            : `Speaker ${index + 1}`
        const isDragging = draggedIndex === index
        const isDragOver = dragOverIndex === index
        const seriesSpeaker = profile.speakerId
          ? seriesSpeakers.find(s => s.speakerId === profile.speakerId)
          : undefined
        const missingLocalization =
          !!profile.isFromSeries &&
          !!profile.speakerId &&
          !!seriesSpeaker &&
          !speakerHasLocalization(seriesSpeaker, locale) &&
          !(profile.title?.trim())
        const hasTitleNoBio =
          locale !== 'en-US' &&
          !!profile.isFromSeries &&
          !!seriesSpeaker &&
          speakerHasLocalization(seriesSpeaker, locale) &&
          !(seriesSpeaker.localizations?.[locale]?.bio ?? seriesSpeaker.bio ?? '').trim()

        return (
          <div
            key={index}
            draggable
            onDragStart={(e: React.DragEvent) => handleDragStart(e, index)}
            onDragOver={(e: React.DragEvent) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e: React.DragEvent) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            style={{
              padding: '16px',
              border: isDragOver
                ? '2px solid var(--spectrum-global-color-blue-500)'
                : '1px solid var(--spectrum-global-color-gray-300)',
              borderRadius: '8px',
              backgroundColor: isDragging
                ? 'var(--spectrum-global-color-gray-100)'
                : 'var(--spectrum-global-color-gray-50)',
              opacity: isDragging ? 0.5 : 1,
              transition: 'border-color 0.2s, background-color 0.2s',
            }}
          >
            <div className={style({display: 'flex', alignItems: 'center', gap: 16})}>
              <DragHandle UNSAFE_style={{ flexShrink: 0, cursor: 'grab' }} />

              {profile.imageUrl ? (
                <img
                  src={profile.imageUrl}
                  alt={displayName}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1px solid var(--spectrum-global-color-gray-300)',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <View
                  UNSAFE_style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--spectrum-global-color-gray-300)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--spectrum-global-color-gray-600)',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  {profile.firstName?.[0] ?? ''}{profile.lastName?.[0] ?? ''}
                </View>
              )}

              <div className={style({display: 'flex', flexDirection: 'column', flexGrow: 1})} style={{minWidth: 0}}>
                <div className={style({display: 'flex', alignItems: 'center', gap: 8})}>
                  <Text UNSAFE_style={{ fontWeight: 600, fontSize: '14px' }}>{displayName}</Text>
                  {missingLocalization && (
                    <TooltipTrigger delay={0}>
                      <ActionButton isQuiet aria-label={`Missing ${locale} content`}>
                        <Alert
                          size="S"
                          UNSAFE_style={{ color: COLORS.ADOBE_RED }}
                        />
                      </ActionButton>
                      <Tooltip variant="negative">
                        This speaker is missing a localized title for {locale}. Add it in the
                        Speakers dashboard or when adding the speaker to avoid display issues.
                      </Tooltip>
                    </TooltipTrigger>
                  )}
                </div>
                {profile.title && (
                  <Text
                    UNSAFE_style={{
                      fontSize: '12px',
                      color: 'var(--spectrum-global-color-gray-600)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {profile.title}
                  </Text>
                )}
                {hasTitleNoBio && (
                  <Text UNSAFE_style={{ fontSize: '11px', color: 'var(--spectrum-global-color-gray-500)', fontStyle: 'italic' }}>
                    No bio for this locale
                  </Text>
                )}
              </div>

              <Picker
                label="Role"
                labelPosition="side"
                selectedKey={profile.type}
                onSelectionChange={(key) => updateProfile(index, { type: key as SpeakerType })}
                styles={style({ width: 192 })}
              >
                {SPEAKER_TYPE_OPTIONS.map(option => (
                  <PickerItem key={option.key} id={option.key}>{option.label}</PickerItem>
                ))}
              </Picker>

              <ActionButton onPress={() => removeProfile(index)} isQuiet aria-label="Remove speaker">
                <Delete size="S" />
              </ActionButton>
            </div>
          </div>
        )
      })}

      {profiles.length > 0 && (
        <Button
          variant="secondary"
          onPress={() => setPickerOpen(true)}
          styles={style({ width: 'full' })}
          UNSAFE_style={{
            backgroundColor: 'var(--spectrum-global-color-gray-200)',
            border: 'none',
            color: 'var(--spectrum-global-color-gray-800)',
            justifyContent: 'flex-start',
            paddingLeft: '16px',
          }}
        >
          <Add />
          <Text>Add Speaker</Text>
        </Button>
      )}

      <SpeakerPickerDialog
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
        seriesSpeakers={seriesSpeakers}
        selectedSpeakerIds={selectedSpeakerIds}
        seriesId={seriesId}
        locale={locale}
        onSpeakersRefresh={refreshSeriesSpeakers}
      />
    </div>
  )
}
