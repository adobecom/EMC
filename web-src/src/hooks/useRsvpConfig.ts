/* 
* <license header>
*/

import { useState, useEffect, useCallback } from 'react'
import { configService } from '../services/configService'
import type { RsvpConfigField, AttendeeColumnConfig } from '../types/attendee'
import { ATTENDEE_TABLE, ATTENDEE_DEFAULT_COLUMNS } from '../config/uiConstants'

/**
 * Convert camelCase to Sentence Case
 * e.g., "firstName" -> "First Name", "companyName" -> "Company Name"
 */
function camelToSentenceCase(str: string): string {
  const result = str.replace(/([a-z])([A-Z])/g, '$1 $2')
  return result.charAt(0).toUpperCase() + result.slice(1)
}

/**
 * Sticky columns that should be fixed on the right side of the table
 */
/**
 * Transform RSVP config fields to column definitions
 */
function transformConfigToColumns(config: RsvpConfigField[]): AttendeeColumnConfig[] {
  // Filter out invalid fields
  const validFields = config.filter(f => 
    f.Field && 
    f.Field.trim() !== '' && 
    !ATTENDEE_TABLE.excludedFieldTypes.includes(f.Type?.toLowerCase() || '') &&
    !ATTENDEE_TABLE.nameFields.includes(f.Field)
  )

  // Start with combined name column
  const columns: AttendeeColumnConfig[] = [
    { 
      key: 'name', 
      label: 'Name', 
      type: 'text', 
      fallback: '-',
      width: 200,
      sortable: true
    }
  ]

  // Add configured fields (excluding sticky columns for now)
  validFields
    .filter(f => !ATTENDEE_TABLE.stickyColumns.includes(f.Field))
    .forEach(field => {
      columns.push({
        key: field.Field,
        label: field.Label || camelToSentenceCase(field.Field),
        type: field.Type || 'text',
        fallback: '-',
        width: getColumnWidth(field.Field),
        sortable: true,
        isSticky: false
      })
    })

  // Add sticky columns at the end
  ATTENDEE_TABLE.stickyColumns.forEach((key) => {
    const existingField = config.find(f => f.Field === key)
    
    columns.push({
      key,
      label: existingField?.Label || getDefaultLabel(key),
      type: existingField?.Type || 'text',
      fallback: key === 'registrationStatus' ? 'registered' : '-',
      width: ATTENDEE_TABLE.columnWidths.sticky,
      sortable: true,
      isSticky: true
    })
  })

  return columns
}

/**
 * Get default label for known fields
 */
function getDefaultLabel(key: string): string {
  return ATTENDEE_TABLE.labelOverrides[key] || camelToSentenceCase(key)
}

/**
 * Get suggested column width based on field type/name
 */
function getColumnWidth(fieldKey: string): number {
  // Email fields need more space
  if (fieldKey === 'email') return ATTENDEE_TABLE.columnWidths.email
  
  // Phone numbers
  if (fieldKey.toLowerCase().includes('phone')) return ATTENDEE_TABLE.columnWidths.phone
  
  // Company/org names
  if (fieldKey.toLowerCase().includes('company') || fieldKey.toLowerCase().includes('organization')) {
    return ATTENDEE_TABLE.columnWidths.company
  }
  
  // Default width
  return ATTENDEE_TABLE.columnWidths.default
}

/**
 * Hook return type
 */
interface UseRsvpConfigResult {
  columnConfig: AttendeeColumnConfig[]
  rawConfig: RsvpConfigField[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook for fetching and managing RSVP configuration
 * Transforms config into column definitions for the attendee table
 * 
 * @param cloudType - The cloud type to fetch config for (CreativeCloud, ExperienceCloud)
 * @returns Column config, loading state, error, and refresh function
 */
export function useRsvpConfig(cloudType: string | undefined): UseRsvpConfigResult {
  const [columnConfig, setColumnConfig] = useState<AttendeeColumnConfig[]>([])
  const [rawConfig, setRawConfig] = useState<RsvpConfigField[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadConfig = useCallback(async () => {
    if (!cloudType) {
      setColumnConfig([])
      setRawConfig([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const config = await configService.getRsvpConfig(cloudType)
      
      if (config.length === 0) {
        console.warn(`No RSVP config found for cloud type: ${cloudType}`)
        // Use default columns if no config available
        setColumnConfig(getDefaultColumns())
        setRawConfig([])
      } else {
        setRawConfig(config)
        setColumnConfig(transformConfigToColumns(config))
      }
    } catch (err) {
      console.error('Failed to load RSVP config:', err)
      setError('Failed to load field configuration')
      // Fall back to default columns on error
      setColumnConfig(getDefaultColumns())
      setRawConfig([])
    } finally {
      setIsLoading(false)
    }
  }, [cloudType])

  // Load config when cloudType changes
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Refresh function for manual reload
  const refresh = useCallback(async () => {
    if (cloudType) {
      // Clear cache for this config
      configService.clearCache()
    }
    await loadConfig()
  }, [cloudType, loadConfig])

  return { 
    columnConfig, 
    rawConfig,
    isLoading, 
    error,
    refresh
  }
}

/**
 * Get default columns when no RSVP config is available
 */
function getDefaultColumns(): AttendeeColumnConfig[] {
  return ATTENDEE_DEFAULT_COLUMNS
}

export default useRsvpConfig

