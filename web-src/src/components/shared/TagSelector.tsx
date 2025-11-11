import React, { useState, useEffect } from 'react'
import {
  View,
  Flex,
  Text,
  ActionButton,
  ComboBox,
  Item,
  Section,
  Key
} from '@adobe/react-spectrum'
import Close from '@spectrum-icons/workflow/Close'
import { EventTag, CaasTagsResponse, CaasTag } from '../../types/domain'
import { apiService } from '../../services/api'
import { LoadingSpinner } from './LoadingSpinner'

interface TagGroup {
  groupName: string
  tags: EventTag[]
}

interface TagSelectorProps {
  selectedTags: EventTag[]
  onChange: (tags: EventTag[]) => void
  label?: string
  description?: string
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onChange,
  label = 'Tags',
  description
}) => {
  const [availableTags, setAvailableTags] = useState<EventTag[]>([])
  const [filteredGroups, setFilteredGroups] = useState<TagGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<TagGroup[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTags()
  }, [])

  useEffect(() => {
    filterAndGroupTags()
  }, [searchTerm, availableTags, selectedTags])
  
  useEffect(() => {
    groupSelectedTags()
  }, [selectedTags])

  const loadTags = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.getCaasTags() as CaasTagsResponse

      if (!response || !response.namespaces) {
        setError('Failed to load tags')
        return
      }

      const tags: EventTag[] = []

      // Extract all tags from the namespaces
      Object.values(response.namespaces).forEach(namespace => {
        if (namespace.tags) {
          extractTagsRecursively(namespace.tags, tags)
        }
      })

      setAvailableTags(tags)
    } catch (err) {
      console.error('Failed to load tags:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tags')
    } finally {
      setIsLoading(false)
    }
  }

  const extractTagsRecursively = (tagsObj: Record<string, CaasTag>, result: EventTag[]) => {
    Object.values(tagsObj).forEach(tag => {
      // Add the tag to our list
      result.push({
        name: tag.title || tag.name,
        caasId: tag.tagID
      })

      // Recursively extract nested tags
      if (tag.tags) {
        extractTagsRecursively(tag.tags, result)
      }
    })
  }

  const groupTagsByParent = (tags: EventTag[]): TagGroup[] => {
    const groupMap = new Map<string, EventTag[]>()

    tags.forEach(tag => {
      if (!tag.caasId) {
        // Tags without caasId go to "Other"
        const existing = groupMap.get('Other') || []
        groupMap.set('Other', [...existing, tag])
        return
      }

      // Strip "caas:" prefix if present
      const cleanPath = tag.caasId.replace(/^caas:/, '')
      
      // Get parent path by removing the last segment
      const pathParts = cleanPath.split('/')
      let groupName = 'Base Tags'
      
      if (pathParts.length > 1) {
        // Use the second-to-last segment as the group name
        const parentSegment = pathParts[pathParts.length - 2]
        // Capitalize and format the group name
        groupName = parentSegment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }

      const existing = groupMap.get(groupName) || []
      groupMap.set(groupName, [...existing, tag])
    })

    // Convert map to array and sort
    const groups: TagGroup[] = []
    groupMap.forEach((tags, groupName) => {
      groups.push({ groupName, tags })
    })

    // Sort groups alphabetically and limit to 15 groups with max 20 tags each
    return groups
      .sort((a, b) => a.groupName.localeCompare(b.groupName))
      .slice(0, 15)
      .map(group => ({
        ...group,
        tags: group.tags.slice(0, 20)
      }))
  }

  const filterAndGroupTags = () => {
    let tagsToGroup: EventTag[]

    if (!searchTerm) {
      // When no search term, show all unselected tags
      tagsToGroup = availableTags.filter(
        tag => !selectedTags.some(selected => selected.caasId === tag.caasId)
      )
    } else {
      // Filter by search term
      const searchLower = searchTerm.toLowerCase()
      tagsToGroup = availableTags.filter(tag => {
        const isMatch = tag.name.toLowerCase().includes(searchLower) ||
                       (tag.caasId && tag.caasId.toLowerCase().includes(searchLower))
        const isNotSelected = !selectedTags.some(selected => selected.caasId === tag.caasId)
        return isMatch && isNotSelected
      })
    }

    setFilteredGroups(groupTagsByParent(tagsToGroup))
  }

  const groupSelectedTags = () => {
    setSelectedGroups(groupTagsByParent(selectedTags))
  }

  const handleAddTag = (key: Key | null) => {
    if (!key) return

    const tagId = String(key)
    const tagToAdd = availableTags.find(tag => tag.caasId === tagId)
    if (tagToAdd && !selectedTags.some(tag => tag.caasId === tagToAdd.caasId)) {
      onChange([...selectedTags, tagToAdd])
      setSearchTerm('') // Clear search after adding
    }
  }

  const handleRemoveTag = (tagToRemove: EventTag) => {
    onChange(selectedTags.filter(tag => tag.caasId !== tagToRemove.caasId))
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading tags..." />
  }

  if (error) {
    return (
      <View
        padding="size-200"
        backgroundColor="negative"
        borderRadius="medium"
      >
        <Text UNSAFE_style={{ color: 'white' }}>Error: {error}</Text>
      </View>
    )
  }

  return (
    <Flex direction="column" gap="size-200">
      <View>
        <Text UNSAFE_style={{ 
          display: 'block',
          marginBottom: '8px',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--spectrum-global-color-gray-800)'
        }}>
          {label}
        </Text>
        {description && (
          <Text UNSAFE_style={{ 
            display: 'block',
            marginBottom: '12px',
            fontSize: '12px',
            color: 'var(--spectrum-global-color-gray-700)'
          }}>
            {description}
          </Text>
        )}
      </View>

      {/* Search/Add Field */}
      <ComboBox
        label="Search and select tags"
        placeholder="Type to search tags..."
        inputValue={searchTerm}
        onInputChange={setSearchTerm}
        onSelectionChange={handleAddTag}
        width="100%"
        menuTrigger="focus"
      >
        {filteredGroups.map(group => (
          <Section key={group.groupName} title={group.groupName}>
            {group.tags.map(tag => (
              <Item key={tag.caasId || tag.name} textValue={tag.name}>
                {tag.name}
              </Item>
            ))}
          </Section>
        ))}
      </ComboBox>

      {/* Selected Tags Pool */}
      {selectedTags.length > 0 && (
        <View
          borderWidth="thin"
          borderColor="gray-400"
          borderRadius="medium"
          padding="size-200"
          UNSAFE_style={{
            backgroundColor: 'var(--spectrum-global-color-gray-75)',
            minHeight: '60px'
          }}
        >
          <Text UNSAFE_style={{ 
            display: 'block',
            marginBottom: '12px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--spectrum-global-color-gray-700)'
          }}>
            Selected Tags ({selectedTags.length})
          </Text>
          <Flex direction="column" gap="size-200">
            {selectedGroups.map(group => (
              <View key={group.groupName}>
                <Text UNSAFE_style={{ 
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--spectrum-global-color-gray-600)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {group.groupName}
                </Text>
                <Flex direction="row" gap="size-100" wrap>
                  {group.tags.map(tag => (
                    <View
                      key={tag.caasId || tag.name}
                      borderRadius="medium"
                      padding="size-100"
                      UNSAFE_style={{
                        backgroundColor: '#2C2C2C',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Text UNSAFE_style={{ 
                        color: 'white',
                        fontSize: '14px'
                      }}>
                        {tag.name}
                      </Text>
                      <ActionButton
                        isQuiet
                        onPress={() => handleRemoveTag(tag)}
                        UNSAFE_style={{
                          minWidth: 'auto',
                          padding: 0,
                          width: '20px',
                          height: '20px'
                        }}
                        aria-label={`Remove ${tag.name}`}
                      >
                        <Close size="XS" UNSAFE_style={{ color: 'white' }} />
                      </ActionButton>
                    </View>
                  ))}
                </Flex>
              </View>
            ))}
          </Flex>
        </View>
      )}

      {selectedTags.length === 0 && (
        <View
          borderWidth="thin"
          borderColor="gray-300"
          borderRadius="medium"
          padding="size-200"
          UNSAFE_style={{
            backgroundColor: 'var(--spectrum-global-color-gray-75)',
            textAlign: 'center'
          }}
        >
          <Text UNSAFE_style={{ 
            fontSize: '12px',
            color: 'var(--spectrum-global-color-gray-600)',
            fontStyle: 'italic'
          }}>
            No tags selected. Search and select tags above.
          </Text>
        </View>
      )}
    </Flex>
  )
}

