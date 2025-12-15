/* 
* <license header>
*/

import React from 'react'
import { Flex, Heading, Text } from '@adobe/react-spectrum'
import { TagSelector } from '../shared'
import { TYPOGRAPHY, FLEX_GAP } from '../../styles/designSystem'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'

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
    <Flex direction="column" gap={FLEX_GAP.SECTION}>
      <Flex direction="column" gap={FLEX_GAP.TIGHT}>
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Event Tags</Heading>
        <Text UNSAFE_style={TYPOGRAPHY.SECTION_DESCRIPTION}>
          Add tags to help users filter for relevant events.
        </Text>
      </Flex>
      
      <TagSelector
        selectedTags={selectedTags}
        onChange={handleTagsChange}
      />
    </Flex>
  )
}
