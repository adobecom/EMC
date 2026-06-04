/* 
* <license header>
*/

import React from 'react'
import { Heading, Text } from '@react-spectrum/s2'
import { SPACING, TYPOGRAPHY } from '../../styles/designSystem'
import { TagSelector } from '../../components/shared'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { useEventFormContext } from '../../contexts/EventFormContext'

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
