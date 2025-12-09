/* 
* <license header>
*/

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Flex,
  View,
  Text,
  Button,
  Picker,
  Item,
  Checkbox,
  ActionButton,
  ProgressCircle,
  StatusLight,
  Well,
  Heading,
} from '@adobe/react-spectrum'
import Close from '@spectrum-icons/workflow/Close'
import Add from '@spectrum-icons/workflow/Add'
import ChevronRight from '@spectrum-icons/workflow/ChevronRight'
import Home from '@spectrum-icons/workflow/Home'
import ArrowLeft from '@spectrum-icons/workflow/ArrowLeft'
import { IMS } from '../types'
import { apiService, deepGetTagByPath, deepGetTagByTagID } from '../services/api'
import { tokenStorage } from '../services/tokenStorage'
import { LoadingSpinner } from './shared'
import {
  COLORS,
  TYPOGRAPHY,
  LAYOUT_DIMENSIONS,
  SPACING,
  FORM_SPACING,
  FLEX_GAP,
  Z_INDEX,
  BORDERS,
  FIXED_ACTION_BAR_STYLES,
  createActionBarPadding,
  ACTION_BAR_BUTTON_STYLES,
} from '../styles/designSystem'

// ============================================================================
// TYPES
// ============================================================================

interface CloudManagementConsoleProps {
  ims: IMS
}

interface CloudData {
  cloudType: string
  cloudName: string
  cloudTags?: CloudTag[]
  locales?: string[]
  modificationTime?: number
  [key: string]: any
}

interface CloudTag {
  caasId: string
  name: string
}

interface CaasTag {
  path: string
  tagID: string
  name: string
  title: string
  description?: string
  tags?: Record<string, CaasTag>
  [key: string]: any
}

// ============================================================================
// STYLES - Using Design System Tokens
// ============================================================================

const styles = {
  // Main container
  container: {
    maxWidth: '1440px',
    margin: '0 auto',
    padding: `${SPACING.XL}px ${SPACING.MD}px`,
  },
  
  // Header section
  header: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    gap: FORM_SPACING.FIELD_GAP,
    marginBottom: FORM_SPACING.SECTION_GAP,
  },
  headerTitle: {
    ...TYPOGRAPHY.STEP_HEADING,
    margin: 0,
  },
  statusContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: SPACING.XS,
    marginTop: SPACING.XXS,
  },
  backLink: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: SPACING.XS,
    color: COLORS.BLACK,
    textDecoration: 'none' as const,
    cursor: 'pointer' as const,
    ...TYPOGRAPHY.SECTION_DESCRIPTION,
    fontWeight: 500,
  },
  
  // Form sections (cards)
  formSection: {
    backgroundColor: COLORS.WHITE,
    padding: `${SPACING.XXL + SPACING.XXS}px ${SPACING.HUGE}px`,
    boxShadow: '0px 4px 4px 0px rgb(0 0 0 / 25%)',
    borderRadius: SPACING.XS,
    marginBottom: FORM_SPACING.SECTION_GAP,
  },
  sectionTitle: {
    ...TYPOGRAPHY.COMPONENT_HEADING,
    marginBottom: FORM_SPACING.SECTION_GAP,
  },
  
  // Tag pool container
  tagPool: {
    minHeight: '120px',
    padding: SPACING.SM,
    ...BORDERS.THIN_GRAY,
    borderRadius: `${SPACING.SM}px`,
    marginBottom: FORM_SPACING.SECTION_GAP,
  },
  
  // Tag chips
  tagItem: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: SPACING.XXS,
    padding: `${SPACING.XXS}px ${SPACING.XS}px`,
    backgroundColor: COLORS.DARK_GRAY,
    color: COLORS.WHITE,
    borderRadius: `${SPACING.XXS}px`,
    cursor: 'pointer' as const,
    fontSize: '14px',
  },
  
  // Miller column menu
  millerMenu: {
    backgroundColor: COLORS.GRAY_100,
    borderRadius: `${SPACING.SM}px`,
    overflow: 'hidden' as const,
  },
  menuGroup: {
    display: 'flex' as const,
    alignItems: 'flex-start' as const,
    padding: SPACING.MD,
    overflow: 'auto' as const,
    gap: SPACING.XS,
  },
  menuColumn: {
    boxShadow: '0 2px 8px 0 rgb(0 0 0 / 10%)',
    backgroundColor: COLORS.WHITE,
    padding: SPACING.XS,
    overflow: 'auto' as const,
    maxWidth: '220px',
    minWidth: '220px',
    maxHeight: '400px',
    scrollbarWidth: 'none' as const,
  },
  menuItem: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: FORM_SPACING.FIELD_GAP,
    padding: `${SPACING.XXS}px ${SPACING.SM}px`,
    cursor: 'pointer' as const,
    borderRadius: `${SPACING.XXS}px`,
    transition: 'background-color 0.2s',
  },
  menuItemInner: {
    display: 'flex' as const,
    gap: SPACING.XS,
    alignItems: 'flex-start' as const,
  },
  
  // Breadcrumbs
  breadcrumbs: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    padding: SPACING.MD,
    backgroundColor: COLORS.GRAY_200,
    overflow: 'auto' as const,
  },
  breadcrumbItem: {
    cursor: 'pointer' as const,
    borderRadius: `${SPACING.XS}px`,
    margin: `0 ${SPACING.XXS}px`,
    whiteSpace: 'nowrap' as const,
    display: 'flex' as const,
    alignItems: 'center' as const,
  },
  
  // Action bar
  actionBar: {
    ...FIXED_ACTION_BAR_STYLES,
    backgroundColor: COLORS.ADOBE_RED,
    padding: `${SPACING.SM}px ${FORM_SPACING.SECTION_GAP}px`,
    display: 'flex' as const,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    gap: FORM_SPACING.FIELD_GAP,
    zIndex: Z_INDEX.ACTION_BAR,
  },
  
  // Toast notification
  toast: {
    transform: 'translateX(-50%)',
    backgroundColor: '#2C8E2C',
    color: COLORS.WHITE,
    padding: `${SPACING.SM}px ${FORM_SPACING.SECTION_GAP}px`,
    borderRadius: `${SPACING.XS}px`,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    zIndex: Z_INDEX.NOTIFICATION,
  },
  
  // No access screen
  noAccessContainer: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: '400px',
    gap: FORM_SPACING.SECTION_GAP,
    textAlign: 'center' as const,
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Decode HTML entities in tag titles
 */
const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CloudManagementConsole: React.FC<CloudManagementConsoleProps> = ({ ims }) => {
  const navigate = useNavigate()

  // Authentication state
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  
  // Data states - All data loaded upfront like v1
  const [clouds, setClouds] = useState<CloudData[]>([])
  const [currentCloud, setCurrentCloud] = useState<string>('')
  const [caasTags, setCaasTags] = useState<Record<string, any>>({})
  const [allLocales, setAllLocales] = useState<Record<string, string>>({})
  
  // Pre-computed saved states for all clouds (like v1)
  const [savedTags, setSavedTags] = useState<Record<string, CaasTag[]>>({})
  const [savedLocales, setSavedLocales] = useState<Record<string, string[]>>({})
  
  // Current selection states
  const [selectedTags, setSelectedTags] = useState<Set<CaasTag>>(new Set())
  const [selectedLocales, setSelectedLocales] = useState<Set<string>>(new Set())
  
  // Navigation states
  const [currentPath, setCurrentPath] = useState<string>('')
  
  // UI states
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Check if there are pending changes
  const pendingChanges = useMemo(() => {
    if (!currentCloud) return false
    
    const savedTagIds = (savedTags[currentCloud] || []).map(t => t.tagID).sort().join(',')
    const selectedTagIds = Array.from(selectedTags).map(t => t.tagID).sort().join(',')
    const hasTagChanges = savedTagIds !== selectedTagIds

    const savedLocaleIds = (savedLocales[currentCloud] || []).sort().join(',')
    const selectedLocaleIds = Array.from(selectedLocales).sort().join(',')
    const hasLocaleChanges = savedLocaleIds !== selectedLocaleIds

    return hasTagChanges || hasLocaleChanges
  }, [selectedTags, savedTags, selectedLocales, savedLocales, currentCloud])

  // ============================================================================
  // ACCESS CHECK - Similar to v1's initProfileLogicTree
  // ============================================================================

  useEffect(() => {
    checkAccess()
  }, [ims])

  const checkAccess = () => {
    // Check if we have a valid token (either from IMS or dev token)
    const devToken = tokenStorage.getValidToken()
    const imsToken = ims?.token
    
    if (devToken || imsToken) {
      setHasAccess(true)
      loadInitialData()
    } else {
      setHasAccess(false)
      setIsLoading(false)
    }
  }

  // ============================================================================
  // DATA LOADING - Load all data upfront like v1
  // ============================================================================

  const loadInitialData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Load CAAS tags first (required for transforming cloud tags)
      const tagsResult = await apiService.getCaasTags()
      
      let caasNamespace: Record<string, any> = {}
      if (tagsResult && tagsResult.namespaces?.caas) {
        caasNamespace = tagsResult.namespaces.caas
        setCaasTags(caasNamespace)
      } else {
        console.error('Failed to load CAAS tags')
        setError('Failed to load tag data')
        return
      }

      // Load clouds and locales in parallel
      const [cloudsResult, localesResult] = await Promise.all([
        apiService.getClouds(),
        apiService.getLocales()
      ])

      // Handle clouds
      if ('error' in cloudsResult) {
        throw new Error(`Failed to load clouds: ${cloudsResult.error}`)
      }
      const cloudsData = cloudsResult as CloudData[]
      setClouds(cloudsData)

      // Handle locales - API returns { localeNames: { "en-US": "English (US)", ... } }
      if (localesResult && !('error' in localesResult)) {
        // Handle both possible response formats
        const localeMap = localesResult.localeNames || localesResult.locales || localesResult
        if (typeof localeMap === 'object' && !Array.isArray(localeMap)) {
          setAllLocales(localeMap)
        } else if (Array.isArray(localeMap)) {
          // Fallback for array format
          const map: Record<string, string> = {}
          localeMap.forEach((locale: any) => {
            if (typeof locale === 'string') {
              map[locale] = locale
            } else if (locale.ietf) {
              map[locale.ietf] = locale.name || locale.ietf
            }
          })
          setAllLocales(map)
        }
      }

      // Pre-compute saved tags and locales for ALL clouds (v1 pattern)
      const precomputedTags: Record<string, CaasTag[]> = {}
      const precomputedLocales: Record<string, string[]> = {}

      cloudsData.forEach((cloud) => {
        const { cloudType, cloudTags, locales } = cloud
        
        // Transform cloud tags to full CAAS tag objects
        if (cloudTags && Array.isArray(cloudTags)) {
          const fullTags = cloudTags
            .map((tag: CloudTag) => deepGetTagByTagID(tag.caasId, caasNamespace))
            .filter(Boolean) as CaasTag[]
          precomputedTags[cloudType] = fullTags
        } else {
          precomputedTags[cloudType] = []
        }

        // Store saved locales
        precomputedLocales[cloudType] = locales || []
      })

      setSavedTags(precomputedTags)
      setSavedLocales(precomputedLocales)

      // Select first cloud by default
      if (cloudsData.length > 0) {
        const firstCloudType = cloudsData[0].cloudType
        setCurrentCloud(firstCloudType)
        setSelectedTags(new Set(precomputedTags[firstCloudType] || []))
        setSelectedLocales(new Set(precomputedLocales[firstCloudType] || []))
      }
    } catch (err) {
      console.error('Error loading initial data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // Switch cloud - instant, no API call needed (data pre-loaded)
  const handleCloudChange = useCallback((cloudType: string | number | null) => {
    if (!cloudType || cloudType === currentCloud) return
    
    const cloudTypeStr = cloudType.toString()
    setCurrentCloud(cloudTypeStr)
    
    // Restore saved selections for this cloud (instant switch)
    setSelectedTags(new Set(savedTags[cloudTypeStr] || []))
    setSelectedLocales(new Set(savedLocales[cloudTypeStr] || []))
    
    // Reset navigation path
    setCurrentPath('')
  }, [currentCloud, savedTags, savedLocales])

  const handleTagSelect = useCallback((tag: CaasTag) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev)
      const existingTag = Array.from(newSet).find(t => t.tagID === tag.tagID)
      if (existingTag) {
        newSet.delete(existingTag)
      } else {
        newSet.add(tag)
      }
      return newSet
    })
  }, [])

  const handleTagRemove = useCallback((tag: CaasTag) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev)
      const existingTag = Array.from(newSet).find(t => t.tagID === tag.tagID)
      if (existingTag) {
        newSet.delete(existingTag)
      }
      return newSet
    })
  }, [])

  const handleMenuItemClick = useCallback((tag: CaasTag) => {
    if (!tag.tags || Object.keys(tag.tags).length === 0) {
      handleTagSelect(tag)
    } else {
      const trimmedPath = tag.path.replace('/content/cq:tags/caas', '')
      setCurrentPath(trimmedPath)
    }
  }, [handleTagSelect])

  const handleLocaleToggle = useCallback((locale: string) => {
    setSelectedLocales(prev => {
      const newSet = new Set(prev)
      if (newSet.has(locale)) {
        newSet.delete(locale)
      } else {
        newSet.add(locale)
      }
      return newSet
    })
  }, [])

  const handleBreadcrumbClick = useCallback((pathIndex: number) => {
    const pathParts = currentPath.split('/').filter(Boolean)
    const newPath = '/' + pathParts.slice(0, pathIndex).join('/')
    setCurrentPath(newPath === '/' ? '' : newPath)
  }, [currentPath])

  const handleResetForm = useCallback(() => {
    setSelectedTags(new Set(savedTags[currentCloud] || []))
    setSelectedLocales(new Set(savedLocales[currentCloud] || []))
  }, [currentCloud, savedTags, savedLocales])

  const handleSave = async () => {
    if (!currentCloud) return

    setIsSaving(true)

    try {
      // Get current cloud data for modificationTime
      const cloudData = await apiService.getCloud(currentCloud)
      if ('error' in cloudData) {
        throw new Error(`Failed to get cloud data: ${cloudData.error}`)
      }

      // Prepare updated data
      const payload = {
        ...cloudData,
        cloudTags: Array.from(selectedTags).map(tag => ({
          caasId: tag.tagID,
          name: tag.title || tag.name
        })),
        locales: Array.from(selectedLocales)
      }

      // Update the cloud
      const result = await apiService.updateCloud(currentCloud, payload)

      if ('error' in result) {
        throw new Error(`Failed to update cloud: ${result.error}`)
      }

      // Update pre-computed saved states
      setSavedTags(prev => ({ ...prev, [currentCloud]: Array.from(selectedTags) }))
      setSavedLocales(prev => ({ ...prev, [currentCloud]: Array.from(selectedLocales) }))

      // Show success toast
      setToastMessage('Changes saved successfully!')
      setTimeout(() => setToastMessage(null), 3000)
    } catch (err) {
      console.error('Error saving cloud:', err)
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================================================
  // CHECKBOX STATE DETERMINATION
  // ============================================================================

  const getCheckboxState = useCallback((tag: CaasTag): 'checked' | 'indeterminate' | 'unchecked' => {
    if (Array.from(selectedTags).some(t => t.tagID === tag.tagID)) {
      return 'checked'
    }

    const tagPath = tag.path.replace('/content/cq:tags/caas', '')
    const hasSelectedChild = Array.from(selectedTags).some(selectedTag => {
      const selectedPath = selectedTag.path.replace('/content/cq:tags/caas', '')
      return selectedPath.startsWith(tagPath + '/')
    })

    return hasSelectedChild ? 'indeterminate' : 'unchecked'
  }, [selectedTags])

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderNoAccessScreen = () => (
    <View padding={FLEX_GAP.LARGE}>
      <View UNSAFE_style={styles.noAccessContainer}>
        <Heading level={2}>Access Required</Heading>
        <Text>
          You need to be signed in with appropriate permissions to access the Cloud Management Console.
        </Text>
        <Text UNSAFE_style={{ color: COLORS.GRAY_600 }}>
          Please sign in or use the Dev Token button to add authentication.
        </Text>
        <Button 
          variant="cta" 
          onPress={() => navigate('/')}
          marginTop={FLEX_GAP.FIELD}
        >
          Go to Home
        </Button>
      </View>
    </View>
  )

  const renderTagPool = () => {
    const tagsArray = Array.from(selectedTags)

    if (tagsArray.length === 0) {
      return (
        <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontStyle: 'italic' }}>
          No tags selected. Use the menu below to add tags.
        </Text>
      )
    }

    return (
      <Flex direction="row" gap={FLEX_GAP.TIGHT} wrap>
        {tagsArray.map(tag => (
          <div
            key={tag.tagID}
            style={styles.tagItem}
            onClick={() => handleTagRemove(tag)}
            role="button"
            tabIndex={0}
            aria-label={`Remove ${tag.title || tag.name}`}
          >
            <span>{decodeHtmlEntities(tag.title || tag.name)}</span>
            <Close size="XS" UNSAFE_style={{ color: COLORS.WHITE }} />
          </div>
        ))}
      </Flex>
    )
  }

  const renderMillerColumns = () => {
    if (!caasTags || Object.keys(caasTags).length === 0) {
      return (
        <View padding={FLEX_GAP.FIELD}>
          <Text>No tags available</Text>
        </View>
      )
    }

    const pathParts = currentPath.split('/').filter(Boolean)
    const columns: React.ReactNode[] = []

    for (let i = 0; i <= pathParts.length; i++) {
      const currentTag = deepGetTagByPath(pathParts, i - 1, caasTags)
      
      if (currentTag && currentTag.tags && Object.keys(currentTag.tags).length > 0) {
        columns.push(
          <View key={`column-${i}`} UNSAFE_style={styles.menuColumn}>
            {Object.entries(currentTag.tags).map(([key, childTag]: [string, any]) => {
              const isSelected = pathParts[i] === key
              const checkboxState = getCheckboxState(childTag)
              const hasChildren = childTag.tags && Object.keys(childTag.tags).length > 0

              return (
                <div
                  key={childTag.tagID || key}
                  style={{
                    ...styles.menuItem,
                    backgroundColor: isSelected ? COLORS.GRAY_200 : 'transparent'
                  }}
                  onClick={() => handleMenuItemClick(childTag)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = COLORS.GRAY_200
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div style={styles.menuItemInner}>
                    <Checkbox
                      isSelected={checkboxState === 'checked'}
                      isIndeterminate={checkboxState === 'indeterminate'}
                      onChange={() => handleTagSelect(childTag)}
                      aria-label={`Select ${childTag.title || childTag.name}`}
                    />
                    <Text>{decodeHtmlEntities(childTag.title || childTag.name)}</Text>
                  </div>
                  {hasChildren && (
                    <ChevronRight size="XS" UNSAFE_style={{ flexShrink: 0 }} />
                  )}
                </div>
              )
            })}
          </View>
        )
      }
    }

    return columns.length > 0 ? columns : (
      <View padding={FLEX_GAP.FIELD}>
        <Text>No tags at this level</Text>
      </View>
    )
  }

  const renderBreadcrumbs = () => {
    const pathParts = currentPath.split('/').filter(Boolean)

    return (
      <View UNSAFE_style={styles.breadcrumbs}>
        <div
          style={styles.breadcrumbItem}
          onClick={() => setCurrentPath('')}
          role="button"
          tabIndex={0}
        >
          <Home size="S" />
        </div>
        {pathParts.map((part, index) => {
          const tag = deepGetTagByPath(pathParts, index, caasTags)
          const isLast = index === pathParts.length - 1

          return (
            <React.Fragment key={`breadcrumb-${index}`}>
              <ChevronRight size="XS" />
              <div
                style={{
                  ...styles.breadcrumbItem,
                  fontWeight: isLast ? 700 : 400
                }}
                onClick={() => handleBreadcrumbClick(index + 1)}
                role="button"
                tabIndex={0}
              >
                {tag?.title || part}
              </div>
            </React.Fragment>
          )
        })}
      </View>
    )
  }

  const renderLocales = () => {
    const localeEntries = Object.entries(allLocales)

    if (localeEntries.length === 0) {
      return (
        <Text UNSAFE_style={{ color: COLORS.GRAY_600, fontStyle: 'italic' }}>
          No locales available
        </Text>
      )
    }

    return (
      <Flex direction="row" gap={FLEX_GAP.TIGHT} wrap>
        {localeEntries.map(([ietf, name]) => {
          const isSelected = selectedLocales.has(ietf)
          
          return (
            <ActionButton
              key={ietf}
              isQuiet={!isSelected}
              onPress={() => handleLocaleToggle(ietf)}
              UNSAFE_style={{
                backgroundColor: isSelected ? COLORS.DARK_GRAY : COLORS.TRANSPARENT,
                color: isSelected ? COLORS.WHITE : COLORS.BLACK,
                border: isSelected ? 'none' : `1px solid ${COLORS.GRAY_400}`
              }}
            >
              {isSelected ? (
                <Flex alignItems="center" gap={FLEX_GAP.TIGHT}>
                  <span>✓</span>
                  <span>{name}</span>
                </Flex>
              ) : (
                <Flex alignItems="center" gap={FLEX_GAP.TIGHT}>
                  <Add size="XS" />
                  <span>{name}</span>
                </Flex>
              )}
            </ActionButton>
          )
        })}
      </Flex>
    )
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  // Loading state
  if (isLoading) {
    return <LoadingSpinner message="Loading Adobe Events Cloud Management Console..." />
  }

  // No access state (like v1's noAccessProfile/noProfile)
  if (hasAccess === false) {
    return renderNoAccessScreen()
  }

  // Error state
  if (error && clouds.length === 0) {
    return (
      <View padding={FLEX_GAP.LARGE}>
        <Well>
          <Text UNSAFE_style={{ color: 'red' }}>Error: {error}</Text>
          <Button variant="primary" onPress={loadInitialData} marginTop={FLEX_GAP.FIELD}>
            Retry
          </Button>
        </Well>
      </View>
    )
  }

  return (
    <View UNSAFE_style={createActionBarPadding()}>
      <View UNSAFE_style={styles.container}>
        {/* Header */}
        <View UNSAFE_style={styles.header}>
          <View>
            <h1 style={styles.headerTitle}>Manage Clouds</h1>
            <View UNSAFE_style={styles.statusContainer}>
              {pendingChanges ? (
                <StatusLight variant="notice">Unsaved changes</StatusLight>
              ) : (
                <StatusLight variant="positive">Up-to-date</StatusLight>
              )}
            </View>
          </View>
          
          <View 
            UNSAFE_style={styles.backLink}
            onClick={() => navigate('/series')}
            role="button"
            tabIndex={0}
          >
            <ArrowLeft size="S" />
            <span>Back to Series dashboard</span>
          </View>
        </View>

        {/* Cloud Picker */}
        <View marginBottom={FLEX_GAP.LARGE} paddingX={FLEX_GAP.FIELD}>
          <Picker
            label="Select a Cloud type"
            selectedKey={currentCloud}
            onSelectionChange={handleCloudChange}
            width="size-3000"
          >
            {clouds.map(cloud => (
              <Item key={cloud.cloudType}>
                {cloud.cloudName || cloud.cloudType}
              </Item>
            ))}
          </Picker>
        </View>

        {currentCloud && (
          <>
            {/* Tag Manager Section */}
            <View UNSAFE_style={styles.formSection}>
              <h2 style={styles.sectionTitle}>Manage Tags</h2>
              
              {/* Selected Tags Pool */}
              <View UNSAFE_style={styles.tagPool}>
                {renderTagPool()}
              </View>

              {/* Tag Selection Label */}
              <Text UNSAFE_style={{ 
                ...TYPOGRAPHY.SUBSECTION_HEADING,
                marginBottom: FORM_SPACING.FIELD_GAP 
              }}>
                Select tags
              </Text>

              {/* Miller Column Menu */}
              <View UNSAFE_style={styles.millerMenu}>
                <View UNSAFE_style={styles.menuGroup}>
                  {renderMillerColumns()}
                </View>
                {renderBreadcrumbs()}
              </View>
            </View>

            {/* Language Manager Section */}
            <View UNSAFE_style={styles.formSection}>
              <h2 style={styles.sectionTitle}>Languages</h2>
              
              <View UNSAFE_style={styles.tagPool}>
                {renderLocales()}
              </View>
            </View>
          </>
        )}

        {/* Toast Message */}
        {toastMessage && (
          <View
            position="fixed"
            bottom="size-1000"
            left="50%"
            UNSAFE_style={styles.toast}
          >
            <Text UNSAFE_style={{ color: COLORS.WHITE }}>{toastMessage}</Text>
          </View>
        )}
      </View>

      {/* Action Bar */}
      <View UNSAFE_style={styles.actionBar}>
        <Button
          variant="secondary"
          isDisabled={!pendingChanges || !currentCloud}
          onPress={handleResetForm}
          UNSAFE_style={ACTION_BAR_BUTTON_STYLES.SAVE}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          isDisabled={!pendingChanges || !currentCloud || isSaving}
          onPress={handleSave}
          UNSAFE_style={ACTION_BAR_BUTTON_STYLES.PRIMARY}
        >
          {isSaving ? (
            <Flex alignItems="center" gap={FLEX_GAP.TIGHT}>
              <ProgressCircle size="S" isIndeterminate aria-label="Saving..." />
              <span>Saving...</span>
            </Flex>
          ) : (
            'Save'
          )}
        </Button>
      </View>
    </View>
  )
}

export default CloudManagementConsole
