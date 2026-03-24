/* 
* <license header>
*/

import React, { useState, useEffect } from 'react'
import { View, Flex, Text, DialogContainer, AlertDialog } from '@adobe/react-spectrum'
import { Button, Text as S2Text } from "@react-spectrum/s2"
import Refresh from "@react-spectrum/s2/icons/Refresh"
import Lock from "@react-spectrum/s2/icons/Lock"
import { cachedApi } from '../../services/api'
import { HeadingWithTooltip } from '../../components/shared'
import { SeriesApiResponse } from '../../types/domain'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { useEventFormContext } from '../../contexts/EventFormContext'
import { COLORS, TYPOGRAPHY, SPACING } from '../../styles/designSystem'

/**
 * EventFormatComponent - Displays cloud type and series selection (read-only)
 * 
 * After the initial format selection dialog confirms cloud + series, this component
 * renders a read-only summary of those choices. For unsaved events, a "Re-select"
 * button allows the user to change cloud/series (with a data-loss warning).
 * 
 * In edit mode (eventId exists), cloud and series are fully locked.
 */
export const EventFormatComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    eventId,
  } = useEventFormComponent({
    componentId: 'event-format',
  })
  
  const { seriesId: contextSeriesId, isFormatConfirmed, resetForReselect } = useEventFormContext()
  
  const cloudType = formData.cloudType
  const seriesId = contextSeriesId || formData.seriesId || ''
  
  // Once the event is created (eventId exists), cloud and series are fully locked
  const isLocked = !!eventId
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [seriesName, setSeriesName] = useState<string>('')
  const [isLoadingName, setIsLoadingName] = useState(false)
  const [showResetWarning, setShowResetWarning] = useState(false)

  // ============================================================================
  // LOAD SERIES NAME FOR DISPLAY
  // ============================================================================
  
  useEffect(() => {
    let isMounted = true

    const loadSeriesName = async () => {
      if (!seriesId) {
        setSeriesName('')
        return
      }
      setIsLoadingName(true)
      try {
        const seriesResponse = await cachedApi.getSeriesList()
        if (!isMounted) return
        if (Array.isArray(seriesResponse)) {
          const found = seriesResponse.find((s: SeriesApiResponse) => s.seriesId === seriesId)
          setSeriesName(found?.seriesName || seriesId)
        } else {
          setSeriesName(seriesId)
        }
      } catch {
        if (isMounted) setSeriesName(seriesId) // Fallback to raw ID
      } finally {
        if (isMounted) setIsLoadingName(false)
      }
    }

    loadSeriesName()
    return () => { isMounted = false }
  }, [seriesId])

  // ============================================================================
  // HELPERS
  // ============================================================================

  const cloudLabel = cloudType === 'CreativeCloud' ? 'Creative Cloud'
    : cloudType === 'ExperienceCloud' ? 'Experience Cloud'
    : 'Not selected'

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleReselectClick = () => {
    setShowResetWarning(true)
  }

  const handleConfirmReselect = () => {
    setShowResetWarning(false)
    resetForReselect()
  }

  const handleCancelReselect = () => {
    setShowResetWarning(false)
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  // Before format is confirmed (and not in edit mode), show a placeholder
  if (!isFormatConfirmed && !isLocked) {
    return (
      <Flex direction="column" gap="size-200">
        <HeadingWithTooltip 
          level={3}
          tooltip="The cloud type and series determine where your event will be published and what metadata it inherits."
        >
          Event Format
        </HeadingWithTooltip>
        <Text UNSAFE_style={TYPOGRAPHY.SECTION_DESCRIPTION}>
          Select cloud and series to continue.
        </Text>
      </Flex>
    )
  }

  return (
    <Flex direction="column" gap="size-200">
      <View>
        <HeadingWithTooltip 
          level={3}
          tooltip="The cloud type and series determine where your event will be published and what metadata it inherits."
        >
          Event Format
        </HeadingWithTooltip>
        <Text UNSAFE_style={TYPOGRAPHY.SECTION_DESCRIPTION}>
          {isLocked
            ? 'Cloud and series are locked after the event is created.'
            : 'Cloud and series for this event.'}
        </Text>
      </View>
      {/* Read-only display of selections */}
      <Flex direction="row" gap="size-400" alignItems="center" wrap>
        {/* Cloud badge */}
        <Flex direction="column" gap="size-50">
          <Text UNSAFE_style={{ ...TYPOGRAPHY.FIELD_LABEL, fontSize: '12px' }}>Cloud</Text>
          <View
            borderWidth="thin"
            borderColor="gray-300"
            borderRadius="regular"
            paddingX="size-200"
            paddingY="size-100"
            UNSAFE_style={{ backgroundColor: COLORS.GRAY_100 }}
          >
            <Flex direction="row" gap="size-100" alignItems="center">
              {isLocked && <Lock />}
              <Text UNSAFE_style={{ fontWeight: 500 }}>{cloudLabel}</Text>
            </Flex>
          </View>
        </Flex>

        {/* Series badge */}
        <Flex direction="column" gap="size-50">
          <Text UNSAFE_style={{ ...TYPOGRAPHY.FIELD_LABEL, fontSize: '12px' }}>Series</Text>
          <View
            borderWidth="thin"
            borderColor="gray-300"
            borderRadius="regular"
            paddingX="size-200"
            paddingY="size-100"
            UNSAFE_style={{ backgroundColor: COLORS.GRAY_100 }}
          >
            <Flex direction="row" gap="size-100" alignItems="center">
              {isLocked && <Lock />}
              <Text UNSAFE_style={{ fontWeight: 500 }}>
                {isLoadingName ? 'Loading...' : (seriesName || 'Not selected')}
              </Text>
            </Flex>
          </View>
        </Flex>

        {/* Re-select button — only for unsaved new events */}
        {!isLocked && (
          <View UNSAFE_style={{ alignSelf: 'flex-end', marginBottom: `${SPACING.XXS}px` }}>
            <Button
              variant="secondary"
              fillStyle="outline"
              onPress={handleReselectClick}
            >
              <Refresh />
              <S2Text>Re-select</S2Text>
            </Button>
          </View>
        )}
      </Flex>
      {/* Re-select warning dialog */}
      <DialogContainer onDismiss={handleCancelReselect}>
        {showResetWarning && (
          <AlertDialog
            title="Re-select Cloud & Series?"
            variant="destructive"
            primaryActionLabel="Reset & Re-select"
            cancelLabel="Cancel"
            onPrimaryAction={handleConfirmReselect}
            onCancel={handleCancelReselect}
          >
            Changing the cloud and series will reset all existing data in this
            form. Any unsaved progress will be lost. Are you sure you want to
            continue?
          </AlertDialog>
        )}
      </DialogContainer>
    </Flex>
  )
}
