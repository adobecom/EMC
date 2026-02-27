/* 
* <license header>
*/

import React, { useEffect, useMemo, useCallback } from 'react'
import {
  Flex,
  View,
  Text,
  Button,
  Picker,
  Item,
  ActionButton,
  ProgressCircle,
  StatusLight,
  Well,
} from '@adobe/react-spectrum'
import Add from '@spectrum-icons/workflow/Add'
import Checkmark from '@spectrum-icons/workflow/Checkmark'
import { IMS } from '../../types'
import { apiService, cachedApi } from '../../services/api'
import { BlurredLoadingOverlay } from '../../components/shared'
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  FORM_SPACING,
  FLEX_GAP,
  Z_INDEX,
  BORDERS,
  FIXED_ACTION_BAR_STYLES,
  createActionBarPadding,
  ACTION_BAR_BUTTON_STYLES,
} from '../../styles/designSystem'
import { useSafeState } from '../../hooks'

// ============================================================================
// TYPES
// ============================================================================

interface CloudManagementConsoleProps {
  ims: IMS
}

interface CloudData {
  cloudType: string
  cloudName: string
  locales?: string[]
  modificationTime?: number
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
  
  // Locale pool container
  localePool: {
    minHeight: '120px',
    padding: SPACING.SM,
    ...BORDERS.THIN_GRAY,
    borderRadius: `${SPACING.SM}px`,
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
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CloudManagementConsole: React.FC<CloudManagementConsoleProps> = () => {

  // Data states
  const [clouds, setClouds] = useSafeState<CloudData[]>([])
  const [currentCloud, setCurrentCloud] = useSafeState<string>('')
  const [allLocales, setAllLocales] = useSafeState<Record<string, string>>({})
  
  // Pre-computed saved locales for all clouds
  const [savedLocales, setSavedLocales] = useSafeState<Record<string, string[]>>({})
  
  // Current selection state
  const [selectedLocales, setSelectedLocales] = useSafeState<Set<string>>(new Set())
  
  // UI states
  const [isLoading, setIsLoading] = useSafeState(true)
  const [isSaving, setIsSaving] = useSafeState(false)
  const [error, setError] = useSafeState<string | null>(null)
  const [toastMessage, setToastMessage] = useSafeState<string | null>(null)

  // Check if there are pending changes
  const pendingChanges = useMemo(() => {
    if (!currentCloud) return false
    
    const savedLocaleIds = (savedLocales[currentCloud] || []).sort().join(',')
    const selectedLocaleIds = Array.from(selectedLocales).sort().join(',')
    
    return savedLocaleIds !== selectedLocaleIds
  }, [selectedLocales, savedLocales, currentCloud])

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadInitialData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Load clouds and locales in parallel
      const [cloudsResult, localesResult] = await Promise.all([
        cachedApi.getClouds(),
        cachedApi.getLocales()
      ])

      // Handle clouds
      if ('error' in cloudsResult) {
        throw new Error(`Failed to load clouds: ${cloudsResult.error}`)
      }
      const cloudsData = cloudsResult as CloudData[]
      setClouds(cloudsData)

      // Handle locales - API returns { localeNames: { "en-US": "English (US)", ... } }
      if (localesResult && !('error' in localesResult)) {
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

      // Pre-compute saved locales for ALL clouds
      const precomputedLocales: Record<string, string[]> = {}
      cloudsData.forEach((cloud) => {
        precomputedLocales[cloud.cloudType] = cloud.locales || []
      })
      setSavedLocales(precomputedLocales)

      // Select first cloud by default
      if (cloudsData.length > 0) {
        const firstCloudType = cloudsData[0].cloudType
        setCurrentCloud(firstCloudType)
        setSelectedLocales(new Set(precomputedLocales[firstCloudType] || []))
      }
    } catch (err) {
      console.error('Error loading initial data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // Switch cloud - instant, no API call needed (data pre-loaded)
  const handleCloudChange = useCallback((cloudType: string | number | null) => {
    if (!cloudType || cloudType === currentCloud) return
    
    const cloudTypeStr = cloudType.toString()
    setCurrentCloud(cloudTypeStr)
    
    // Restore saved selections for this cloud (instant switch)
    setSelectedLocales(new Set(savedLocales[cloudTypeStr] || []))
  }, [currentCloud, savedLocales])

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

  const handleResetForm = useCallback(() => {
    setSelectedLocales(new Set(savedLocales[currentCloud] || []))
  }, [currentCloud, savedLocales])

  const handleSave = async () => {
    if (!currentCloud) return

    setIsSaving(true)

    try {
      // Get current cloud data for modificationTime
      const cloudData = await cachedApi.getCloud(currentCloud)
      
      if ('error' in cloudData) {
        throw new Error(`Failed to get cloud data: ${cloudData.error}`)
      }

      // Prepare updated data - only updating locales
      const payload = {
        ...cloudData,
        locales: Array.from(selectedLocales)
      }

      // Update the cloud
      const result = await apiService.updateCloud(currentCloud, payload)

      if ('error' in result) {
        throw new Error(`Failed to update cloud: ${result.error}`)
      }

      // Update pre-computed saved states
      setSavedLocales(prev => ({ ...prev, [currentCloud]: Array.from(selectedLocales) }))

      // Show success toast
      setToastMessage('Changes saved successfully!')
      setTimeout(() => {
        setToastMessage(null)
      }, 3000)
    } catch (err) {
      console.error('Error saving cloud:', err)
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

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
              isQuiet
              onPress={() => handleLocaleToggle(ietf)}
              aria-pressed={isSelected}
              UNSAFE_className={isSelected ? 'locale-btn-selected' : 'locale-btn'}
            >
              <Flex alignItems="center" gap="size-75">
                {isSelected ? <Checkmark size="S" /> : <Add size="S" />}
                <Text>{name}</Text>
              </Flex>
            </ActionButton>
          )
        })}
      </Flex>
    )
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

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
    <>
      <View UNSAFE_style={createActionBarPadding()}>
        <View UNSAFE_style={styles.container}>
        {/* Header */}
        <View UNSAFE_style={styles.header}>
          <h1 style={styles.headerTitle}>Manage Clouds</h1>
          <View UNSAFE_style={styles.statusContainer}>
            {pendingChanges ? (
              <StatusLight variant="notice">Unsaved changes</StatusLight>
            ) : (
              <StatusLight variant="positive">Up-to-date</StatusLight>
            )}
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
            {/* Language Manager Section */}
            <View UNSAFE_style={styles.formSection}>
              <h2 style={styles.sectionTitle}>Languages</h2>
              <Text UNSAFE_style={{ 
                ...TYPOGRAPHY.SECTION_DESCRIPTION,
                marginBottom: FORM_SPACING.FIELD_GAP 
              }}>
                Select the languages available for events in this cloud.
              </Text>
              
              <View UNSAFE_style={styles.localePool}>
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

      <BlurredLoadingOverlay
        visible={isLoading}
        message="Loading Cloud Management Console..."
        ariaLabel="Loading Cloud Management Console"
      />
    </>
  )
}

export default CloudManagementConsole
