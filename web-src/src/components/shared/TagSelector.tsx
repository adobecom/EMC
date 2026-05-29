import React, { useState, useEffect } from 'react'
import { Text, SearchField } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Close from '@react-spectrum/s2/icons/Close'
import Add from '@react-spectrum/s2/icons/Add'
import { EventTag, CaasTagsResponse, CaasTag } from '../../types/domain'
import { cachedApi } from '../../services/api'
import { COLORS } from '../../styles/designSystem'
import { LoadingSpinner } from './LoadingSpinner'

/** S2 icons (Add, Close) use fill: var(--iconPrimary); chip bg from index.css for light/dark */
const TAG_CHIP_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--emc-tag-chip-bg)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  borderRadius: '4px',
  padding: '8px',
  '--iconPrimary': COLORS.WHITE,
} as React.CSSProperties

interface TagGroup {
  groupName: string
  tags: EventTag[]
}

interface TagSelectorProps {
  selectedTags: EventTag[]
  onChange: (tags: EventTag[]) => void
  placement?: 'top' | 'bottom'
  tagsUrl?: string
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onChange,
  placement = 'bottom',
  tagsUrl,
}) => {
  const [availableTags, setAvailableTags] = useState<EventTag[]>([])
  const [filteredGroups, setFilteredGroups] = useState<TagGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<TagGroup[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadTagsAsync = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await (tagsUrl ? cachedApi.getTagsFromUrl(tagsUrl) : cachedApi.getCaasTags()) as CaasTagsResponse

        if (!isMounted) return

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

        if (isMounted) {
          setAvailableTags(tags)
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load tags:', err)
        setError(err instanceof Error ? err.message : 'Failed to load tags')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTagsAsync()

    return () => {
      isMounted = false
    }
  }, [tagsUrl])

  useEffect(() => {
    filterAndGroupTags()
  }, [searchTerm, availableTags, selectedTags])

  useEffect(() => {
    groupSelectedTags()
  }, [selectedTags])

  // Enrich selected tags with proper names from Chimera data
  // This handles tags loaded from API that only have caasId
  useEffect(() => {
    if (availableTags.length === 0 || selectedTags.length === 0) return

    const enrichedTags = selectedTags.map(selectedTag => {
      // If tag already has a proper name (not just the path segment), keep it
      if (selectedTag.name && !selectedTag.name.includes('/')) {
        // Check if we can find a better name from available tags
        const matchingTag = availableTags.find(t => t.caasId === selectedTag.caasId)
        if (matchingTag && matchingTag.name !== selectedTag.name) {
          return { ...selectedTag, name: matchingTag.name }
        }
      }

      // Look up the tag by caasId to get proper display name
      const matchingTag = availableTags.find(t => t.caasId === selectedTag.caasId)
      if (matchingTag) {
        return { ...selectedTag, name: matchingTag.name }
      }

      return selectedTag
    })

    // Only update if names have actually changed
    const hasChanges = enrichedTags.some((tag, i) => tag.name !== selectedTags[i].name)
    if (hasChanges) {
      onChange(enrichedTags)
    }
  }, [availableTags]) // Only run when availableTags loads


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

  /**
   * Format a path segment into a readable name
   * e.g., "product-categories" -> "Product Categories"
   */
  const formatPathSegment = (segment: string): string => {
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
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

      // Get parent path by removing the last segment (the tag itself)
      const pathParts = cleanPath.split('/')
      let groupName = 'Base Tags'

      if (pathParts.length > 1) {
        // Build the full lineage path (all parents except the tag itself)
        const parentParts = pathParts.slice(0, -1)

        // Format each segment and join with " > " for clear hierarchy
        groupName = parentParts
          .map(formatPathSegment)
          .join(' > ')
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

  const handleAddTag = (tagToAdd: EventTag) => {
    if (!selectedTags.some(tag => tag.caasId === tagToAdd.caasId)) {
      onChange([...selectedTags, tagToAdd])
      setSearchTerm('') // Clear search after adding
    }
  }

  const handleRemoveTag = (tagToRemove: EventTag) => {
    onChange(selectedTags.filter(tag => tag.caasId !== tagToRemove.caasId))
  }

  const dropdownPositionStyle: React.CSSProperties = placement === 'top'
    ? {
        bottom: '100%',
        marginBottom: '4px'
      }
    : {
        top: '100%',
        marginTop: '4px'
      }

  if (isLoading) {
    return <LoadingSpinner message="Loading tags..." />
  }

  if (error) {
    return (
      <div style={{ padding: 16, backgroundColor: 'var(--spectrum-negative-background-color-default)', borderRadius: 4 }}>
        <Text UNSAFE_style={{ color: 'white' }}>Error: {error}</Text>
      </div>
    )
  }

  return (
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 16 })}>
      {/* Search/Add Field with Dropdown */}
      <div style={{ position: 'relative' }}>
        <SearchField
          label="Search tags"
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value)
            setIsDropdownOpen(true)
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => {
            // Delay closing to allow click events on dropdown items
            setTimeout(() => setIsDropdownOpen(false), 200)
          }}
          styles={style({ width: '[100%]' })}
        />

        {/* Dropdown with Available Tags */}
        {isDropdownOpen && filteredGroups.length > 0 && (
          <div
            style={{
              position: 'absolute',
              width: '100%',
              left: 0,
              zIndex: 1000,
              backgroundColor: 'var(--spectrum-global-color-gray-100)',
              border: '1px solid var(--spectrum-global-color-gray-300)',
              borderRadius: '4px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
              maxHeight: '300px',
              overflowY: 'auto',
              ...dropdownPositionStyle
            }}
          >
            <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })} style={{ padding: '12px' }}>
              {filteredGroups.map(group => (
                <div key={group.groupName}>
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
                  <div className={style({ display: 'flex', gap: 8, flexWrap: 'wrap' })}>
                    {group.tags.map(tag => (
                      <div
                        key={tag.caasId || tag.name}
                        style={TAG_CHIP_STYLE}
                        onClick={() => {
                          handleAddTag(tag)
                          setIsDropdownOpen(false)
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Add ${tag.name}`}
                      >
                        <Text UNSAFE_style={{
                          color: 'white',
                          fontSize: '14px'
                        }}>
                          {tag.name}
                        </Text>
                        <Add />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isDropdownOpen && filteredGroups.length === 0 && searchTerm && (
          <div
            style={{
              position: 'absolute',
              width: '100%',
              left: 0,
              zIndex: 1000,
              backgroundColor: 'var(--spectrum-global-color-gray-100)',
              border: '1px solid var(--spectrum-global-color-gray-300)',
              borderRadius: '4px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
              padding: '12px',
              textAlign: 'center',
              ...dropdownPositionStyle
            }}
          >
            <Text UNSAFE_style={{
              fontSize: '12px',
              color: 'var(--spectrum-global-color-gray-600)',
              fontStyle: 'italic'
            }}>
              No matching tags found
            </Text>
          </div>
        )}
      </div>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
          <Text UNSAFE_style={{
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--spectrum-global-color-gray-700)',
            letterSpacing: '0.5px'
          }}>
            Selected Tags
          </Text>
          {selectedGroups.map(group => (
            <div key={group.groupName}>
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
              <div className={style({ display: 'flex', gap: 8, flexWrap: 'wrap' })}>
                {group.tags.map(tag => (
                  <div
                    key={tag.caasId || tag.name}
                    style={TAG_CHIP_STYLE}
                    onClick={() => handleRemoveTag(tag)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${tag.name}`}
                  >
                    <Text UNSAFE_style={{
                      color: 'white',
                      fontSize: '14px'
                    }}>
                      {tag.name}
                    </Text>
                    <Close />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
