import React, { useState, useEffect } from 'react'
import {
  View,
  Flex,
  Text,
  ActionButton,
  ComboBox,
  Item,
  Key
} from '@adobe/react-spectrum'
import Close from '@spectrum-icons/workflow/Close'
import { EventTag, CaasTagsResponse, CaasTag } from '../../types/domain'
import { apiService } from '../../services/api'
import { LoadingSpinner } from './LoadingSpinner'

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
  const [filteredTags, setFilteredTags] = useState<EventTag[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTags()
  }, [])

  useEffect(() => {
    filterTags()
  }, [searchTerm, availableTags, selectedTags])

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

  const filterTags = () => {
    if (!searchTerm) {
      // When no search term, show all unselected tags
      const unselectedTags = availableTags.filter(
        tag => !selectedTags.some(selected => selected.caasId === tag.caasId)
      )
      setFilteredTags(unselectedTags)
      return
    }

    const searchLower = searchTerm.toLowerCase()
    const filtered = availableTags.filter(tag => {
      const isMatch = tag.name.toLowerCase().includes(searchLower) ||
                     (tag.caasId && tag.caasId.toLowerCase().includes(searchLower))
      const isNotSelected = !selectedTags.some(selected => selected.caasId === tag.caasId)
      return isMatch && isNotSelected
    })

    setFilteredTags(filtered)
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
        {filteredTags.slice(0, 50).map(tag => (
          <Item key={tag.caasId || tag.name} textValue={tag.name}>
            {`${tag.name} (${tag.caasId ?? tag.caasId})`}
          </Item>
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
            marginBottom: '8px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--spectrum-global-color-gray-700)'
          }}>
            Selected Tags ({selectedTags.length})
          </Text>
          <Flex direction="row" gap="size-100" wrap>
            {selectedTags.map(tag => (
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
                  {tag.name}{tag.caasId && ` | ${tag.caasId}`}
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

