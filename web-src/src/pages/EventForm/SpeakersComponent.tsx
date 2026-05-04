/* 
* <license header>
*/

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Button, Heading, Text, Picker, PickerItem, ActionButton, ProgressCircle, TooltipTrigger, Tooltip } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { ProfileData, SeriesSpeaker, SpeakerType, EventApiResponse } from '../../types/domain'
import { SpeakerPickerDialog } from './SpeakerPickerDialog'
import { TYPOGRAPHY, COLORS, SURFACES } from '../../styles/designSystem'
import { speakerHasLocalization } from '../../utils/eventFormMappers'
import Add from '@react-spectrum/s2/icons/Add'
import AlertTriangle from '@react-spectrum/s2/icons/AlertTriangle'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import Move from '@react-spectrum/s2/icons/Move'
import { apiService, cachedApi } from '../../services/api'
import { useToast } from '../../contexts'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { useEventFormContext } from '../../contexts'

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

      const typeOrdinalCounters: Record<string, number> = {}
      const currentSpeakers = profiles
        .filter(p => p.speakerId && p.isSaved)
        .map(p => {
          const speakerType = toApiSpeakerType(p.type)
          if (typeOrdinalCounters[speakerType] === undefined) typeOrdinalCounters[speakerType] = 0
          const ordinal = typeOrdinalCounters[speakerType]++
          return { speakerId: p.speakerId!, speakerType, ordinal }
        })

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

  const { setSeriesSpeakers: setContextSeriesSpeakers } = useEventFormContext()
  const [seriesSpeakers, setSeriesSpeakersLocal] = useState<SeriesSpeaker[]>([])
  const setSeriesSpeakers = useCallback((speakers: SeriesSpeaker[]) => {
    setSeriesSpeakersLocal(speakers)
    setContextSeriesSpeakers(speakers)
  }, [setContextSeriesSpeakers])
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draggedItem, setDraggedItem] = useState<{ type: SpeakerType; idx: number } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<{ type: SpeakerType; idx: number } | null>(null)

  const groupedProfiles = useMemo(() => {
    const map = new Map<SpeakerType, { profile: ProfileData; globalIndex: number }[]>()
    SPEAKER_TYPE_OPTIONS.forEach(opt => map.set(opt.key, []))
    profiles.forEach((profile, globalIndex) => {
      const type = profile.type as SpeakerType
      if (!map.has(type)) map.set(type, [])
      map.get(type)!.push({ profile, globalIndex })
    })
    for (const [key, items] of map) {
      if (items.length === 0) map.delete(key)
    }
    return map
  }, [profiles])

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
  }, [seriesId, setSeriesSpeakers])

  const selectedSpeakerIds = new Set(profiles.map(p => p.speakerId).filter(Boolean) as string[])

  const refreshSeriesSpeakers = useCallback(async () => {
    if (!seriesId) return
    const response = await cachedApi.getSpeakers(seriesId)
    if (response && !('error' in response)) {
      const speakers = response.speakers || response || []
      setSeriesSpeakers(Array.isArray(speakers) ? speakers : [])
    }
  }, [seriesId, setSeriesSpeakers])

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

  const handleRoleChange = useCallback((globalIndex: number, newType: SpeakerType) => {
    const updated = profiles.map((p, i) => i === globalIndex ? { ...p, type: newType } : p)
    const moved = updated[globalIndex]
    const without = updated.filter((_, i) => i !== globalIndex)
    let insertAt = without.length
    for (let i = without.length - 1; i >= 0; i--) {
      if (without[i].type === newType) {
        insertAt = i + 1
        break
      }
    }
    updateFormData({ profiles: [...without.slice(0, insertAt), moved, ...without.slice(insertAt)] })
  }, [profiles, updateFormData])

  const handleDragStart = (e: React.DragEvent, type: SpeakerType, idx: number) => {
    setDraggedItem({ type, idx })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `${type}:${idx}`)
  }

  const handleDragOver = (e: React.DragEvent, type: SpeakerType, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedItem !== null && draggedItem.type === type && draggedItem.idx !== idx) {
      setDragOverItem({ type, idx })
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) return
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, type: SpeakerType, dropIdx: number) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.type !== type || draggedItem.idx === dropIdx) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }
    const groupItems = groupedProfiles.get(type) || []
    const groupProfiles = groupItems.map(item => item.profile)
    const [dragged] = groupProfiles.splice(draggedItem.idx, 1)
    groupProfiles.splice(dropIdx, 0, dragged)
    // Replace positions occupied by this group in the global array
    const sortedGlobalIndices = groupItems.map(item => item.globalIndex).sort((a, b) => a - b)
    const newProfiles = [...profiles]
    sortedGlobalIndices.forEach((globalIdx, i) => {
      newProfiles[globalIdx] = groupProfiles[i]
    })
    updateFormData({ profiles: newProfiles })
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

  return (
    <div className={style({display: 'flex', flexDirection: 'column', gap: 24})}>
      <div className={style({display: 'flex', alignItems: 'center', gap: 12})}>
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>
          Speakers & Hosts
        </Heading>
        {isLoadingSpeakers && (
          <ProgressCircle isIndeterminate aria-label="Loading speakers" />
        )}
      </div>

      <Text>
        Add speaker and event host details. Drag to reorder within each role group. You can change each speaker&apos;s role for this event.
      </Text>

      {profiles.length > 0 && (
        <Text UNSAFE_style={{ ...TYPOGRAPHY.HELPER_TEXT, fontStyle: 'italic' }}>
          The order of role groups shown here does not determine how they appear on the event landing page. Group sequencing is controlled by the page template configuration in the DA authoring documentation.
        </Text>
      )}

      {profiles.length === 0 && (
        <div
          style={{
            padding: '32px',
            backgroundColor: SURFACES.SUBTLE,
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          <div className={style({display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16})}>
            <Text>Add speakers to your event using the button below.</Text>
            <Button data-testid="add-speaker-button" variant="secondary" onPress={() => setPickerOpen(true)}>
              <Add />
              <Text>Add Speaker</Text>
            </Button>
          </div>
        </div>
      )}

      {Array.from(groupedProfiles.entries()).map(([type, groupItems]) => {
        const typeLabel = SPEAKER_TYPE_OPTIONS.find(o => o.key === type)?.label ?? type
        return (
          <div
            key={type}
            style={{
              border: `1px solid ${SURFACES.BORDER}`,
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '10px 16px',
                backgroundColor: SURFACES.SUBTLE,
                borderBottom: `1px solid ${SURFACES.BORDER}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Text UNSAFE_style={{ ...TYPOGRAPHY.FIELD_LABEL, fontWeight: 600 }}>{typeLabel}</Text>
              <Text UNSAFE_style={{ ...TYPOGRAPHY.HELPER_TEXT }}>
                {groupItems.length} {groupItems.length === 1 ? 'speaker' : 'speakers'}
              </Text>
            </div>

            <div className={style({display: 'flex', flexDirection: 'column', gap: 0})}>
              {groupItems.map(({ profile, globalIndex }, groupIdx) => {
                const displayName =
                  profile.firstName && profile.lastName
                    ? `${profile.firstName} ${profile.lastName}`
                    : `Speaker ${globalIndex + 1}`
                const isDragging = draggedItem?.type === type && draggedItem.idx === groupIdx
                const isDragOver = dragOverItem?.type === type && dragOverItem.idx === groupIdx
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
                    key={globalIndex}
                    draggable
                    onDragStart={(e: React.DragEvent) => handleDragStart(e, type, groupIdx)}
                    onDragOver={(e: React.DragEvent) => handleDragOver(e, type, groupIdx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e: React.DragEvent) => handleDrop(e, type, groupIdx)}
                    onDragEnd={handleDragEnd}
                    style={{
                      padding: '16px',
                      borderBottom: groupIdx < groupItems.length - 1 ? `1px solid ${SURFACES.BORDER}` : 'none',
                      border: isDragOver ? `2px solid ${SURFACES.SELECTED_RING}` : undefined,
                      backgroundColor: isDragging ? SURFACES.SUBTLE : SURFACES.CANVAS,
                      opacity: isDragging ? 0.5 : 1,
                      transition: 'border-color 0.2s, background-color 0.2s',
                    }}
                  >
                    <div className={style({display: 'flex', alignItems: 'center', gap: 16})}>
                      <span style={{ flexShrink: 0, cursor: 'grab', display: 'flex' }} aria-hidden>
                        <Move />
                      </span>

                      {profile.imageUrl ? (
                        <img
                          src={profile.imageUrl}
                          alt={displayName}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: `1px solid ${SURFACES.BORDER}`,
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: SURFACES.CHROME,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: COLORS.GRAY_600,
                            fontSize: '14px',
                            fontWeight: 'bold',
                            flexShrink: 0,
                          }}
                        >
                          {profile.firstName?.[0] ?? ''}{profile.lastName?.[0] ?? ''}
                        </div>
                      )}

                      <div className={style({display: 'flex', flexDirection: 'column', flexGrow: 1})} style={{minWidth: 0}}>
                        <div className={style({display: 'flex', alignItems: 'center', gap: 8})}>
                          <Text UNSAFE_style={{ fontWeight: 600, fontSize: '14px' }}>{displayName}</Text>
                          {missingLocalization && (
                            <TooltipTrigger delay={0}>
                              <ActionButton isQuiet aria-label={`Missing ${locale} content`}>
                                <AlertTriangle UNSAFE_style={{ color: COLORS.RED_600 }} />
                              </ActionButton>
                              <Tooltip>
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
                              color: COLORS.GRAY_600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {profile.title}
                          </Text>
                        )}
                        {hasTitleNoBio && (
                          <Text UNSAFE_style={{ fontSize: '11px', color: COLORS.GRAY_500, fontStyle: 'italic' }}>
                            No bio for this locale
                          </Text>
                        )}
                      </div>

                      <Picker
                        label="Role"
                        labelPosition="side"
                        selectedKey={profile.type}
                        onSelectionChange={(key) => handleRoleChange(globalIndex, key as SpeakerType)}
                        styles={style({ width: 192 })}
                      >
                        {SPEAKER_TYPE_OPTIONS.map(option => (
                          <PickerItem key={option.key} id={option.key}>{option.label}</PickerItem>
                        ))}
                      </Picker>

                      <ActionButton onPress={() => removeProfile(globalIndex)} isQuiet aria-label="Remove speaker">
                        <RemoveCircle />
                      </ActionButton>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {profiles.length > 0 && (
        <Button
          data-testid="add-speaker-button"
          variant="secondary"
          onPress={() => setPickerOpen(true)}
          styles={style({ width: '[100%]' })}
          UNSAFE_style={{
            backgroundColor: SURFACES.PILL_BG,
            border: 'none',
            color: COLORS.DARK_GRAY,
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
