/* 
* <license header>
*/

import React from 'react'
import { View, Heading, Text } from '@adobe/react-spectrum'
import { TagSelector } from '../shared'
import { EventTag } from '../../types/domain'

interface EventTagsComponentProps {
  selectedTags: EventTag[]
  onChange: (tags: EventTag[]) => void
}

export const EventTagsComponent: React.FC<EventTagsComponentProps> = ({
  selectedTags,
  onChange
}) => {
  return (
    <View>
      <Heading level={3}>Tags & Topics</Heading>
      <Text marginBottom="size-200">
        Choose one or more tags from the Adobe CAAS taxonomy. This will add metadata to your event for better discoverability.
      </Text>
      
      <TagSelector
        selectedTags={selectedTags}
        onChange={onChange}
        description="Search and select tags to categorize your event"
      />
    </View>
  )
}

