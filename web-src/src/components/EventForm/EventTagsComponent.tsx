/* 
* <license header>
*/

import React from 'react'
import { Flex, Heading, Text } from '@adobe/react-spectrum'
import { TagSelector } from '../shared'
import { EventTag } from '../../types/domain'
import { TYPOGRAPHY, FLEX_GAP } from '../../styles/designSystem'

interface EventTagsComponentProps {
  selectedTags: EventTag[]
  onChange: (tags: EventTag[]) => void
}

export const EventTagsComponent: React.FC<EventTagsComponentProps> = ({
  selectedTags,
  onChange
}) => {
  return (
    <Flex direction="column" gap={FLEX_GAP.SECTION}>
      <Flex direction="column" gap={FLEX_GAP.TIGHT}>
        <Heading level={3} UNSAFE_style={TYPOGRAPHY.COMPONENT_HEADING}>Tags & Topics</Heading>
        <Text UNSAFE_style={TYPOGRAPHY.SECTION_DESCRIPTION}>
          Add metadata from the Adobe CAAS taxonomy to improve discoverability.
        </Text>
      </Flex>
      
      <TagSelector
        selectedTags={selectedTags}
        onChange={onChange}
      />
    </Flex>
  )
}

