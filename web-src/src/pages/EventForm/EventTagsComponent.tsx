/*
* <license header>
*/

import React from 'react'
import { Badge, Heading, Text, TooltipTrigger, Tooltip, ActionButton } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Lock from '@react-spectrum/s2/icons/Lock'
import InfoCircle from '@react-spectrum/s2/icons/InfoCircle'
import { SPACING, TYPOGRAPHY } from '../../styles/designSystem'
import { TagSelector } from '../../components/shared'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { useEventFormContext } from '../../contexts/EventFormContext'
import { resolveContentTypeTag } from '../../config/contentTypeTag'

/**
 * EventTagsComponent - Manages event tags/topics
 *
 * Uses EventFormContext for state management.
 * Simple data collector - no API calls needed.
 */
export const EventTagsComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================

  const {
    formData,
    updateFormData,
  } = useEventFormComponent({
    componentId: 'event-tags',
  })

  const { seriesCustomTagsUrl } = useEventFormContext()

  const selectedTags = formData.tags || []

  // The caas:content-type tag is derived downstream at CaaS-publish time and never
  // stored on the event, so this is a display-only mirror of that derivation. It is
  // deliberately NOT written into formData — doing so would mark every event dirty
  // on open and would make EMC a second source of truth for the tag.
  const contentTypeTag = resolveContentTypeTag(formData.eventType, selectedTags)

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTagsChange = (tags: typeof selectedTags) => {
    updateFormData({ tags })
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.LG }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.XS }}>
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Event Tags</Heading>
        <Text UNSAFE_style={TYPOGRAPHY.SECTION_DESCRIPTION}>
          Add tags to help users filter for relevant events.
        </Text>
      </div>

      {/* Content type tag — restates the format-based rule; read-only, never saved */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: SPACING.XS }}
        data-testid="content-type-tag"
      >
        <div className={style({ display: 'flex', gap: 4, alignItems: 'center' })}>
          <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>Content type</Text>
          <TooltipTrigger delay={0}>
            <ActionButton isQuiet aria-label="About the content type tag">
              <InfoCircle />
            </ActionButton>
            <Tooltip>
              Events are tagged by format so they appear in the right Events Hub
              collections. This tag is added to your event&apos;s CaaS data when it
              publishes — it is not stored on the event itself, so it is shown here for
              reference rather than read back from the event.
            </Tooltip>
          </TooltipTrigger>
        </div>

        <div className={style({ display: 'flex', gap: 8, flexWrap: 'wrap' })}>
          <Badge variant="neutral" fillStyle="subtle" size="M">
            <Lock />
            <Text>{contentTypeTag.title}</Text>
          </Badge>
        </div>

        <Text UNSAFE_style={TYPOGRAPHY.HELPER_TEXT}>
          {contentTypeTag.formatLabel
            ? `${contentTypeTag.formatLabel} events are tagged ${contentTypeTag.caasId} in CaaS. Set by the event format, not editable here.`
            : `This event is tagged ${contentTypeTag.caasId} in CaaS. Set by the event format, not editable here.`}
        </Text>

        {contentTypeTag.manualOverride && (
          <Text UNSAFE_style={TYPOGRAPHY.HELPER_TEXT}>
            You have also selected {contentTypeTag.manualOverride.caasId} below, which
            replaces {contentTypeTag.caasId} in the event&apos;s CaaS tags. The event is
            still classified as {contentTypeTag.title} either way, so remove the extra tag
            unless you specifically need it.
          </Text>
        )}
      </div>

      <div data-testid="tag-selector">
        <TagSelector
          selectedTags={selectedTags}
          onChange={handleTagsChange}
          tagsUrl={seriesCustomTagsUrl || undefined}
        />
      </div>
    </div>
  )
}
