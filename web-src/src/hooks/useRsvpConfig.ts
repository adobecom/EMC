/* 
* <license header>
*/

import { useState, useEffect, useCallback } from 'react'
import { configService } from '../services/configService'
import type { RsvpConfigField, AttendeeColumnConfig } from '../types/attendee'
import { rsvpConfigUiLabel } from '../utils/rsvpConfigLabels'

/**
 * Convert camelCase to Sentence Case
 * e.g., "firstName" -> "First Name", "companyName" -> "Company Name"
 */
function camelToSentenceCase(str: string): string {
  const result = str.replace(/([a-z])([A-Z])/g, '$1 $2')
  return result.charAt(0).toUpperCase() + result.slice(1)
}

/**
 * Sticky columns fixed on the right (after dynamic RSVP fields).
 * Registered date sits immediately before status and checked-in.
 */
const STICKY_COLUMNS = ['registrationStatus', 'checkedIn']

/** System-backed columns — do not duplicate from RSVP field list */
const RESERVED_ATTENDEE_FIELDS = ['creationTime', 'modificationTime']

/**
 * Fields to exclude from individual columns (combined into 'name')
 */
const NAME_FIELDS = ['firstName', 'lastName']

/**
 * Fields to exclude from column generation
 */
const EXCLUDED_FIELD_TYPES = ['submit', 'button', 'hidden']

/**
 * Transform RSVP config fields to column definitions
 */
function transformConfigToColumns(config: RsvpConfigField[]): AttendeeColumnConfig[] {
  // Filter out invalid fields
  const validFields = config.filter(f => 
    f.Field && 
    f.Field.trim() !== '' && 
    !EXCLUDED_FIELD_TYPES.includes(f.Type?.toLowerCase()) &&
    !NAME_FIELDS.includes(f.Field) &&
    !RESERVED_ATTENDEE_FIELDS.includes(f.Field) &&
    !STICKY_COLUMNS.includes(f.Field)
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

  // Add configured fields
  validFields.forEach(field => {
    columns.push({
      key: field.Field,
      label: rsvpConfigUiLabel(field, camelToSentenceCase),
      type: field.Type || 'text',
      fallback: '-',
      width: getColumnWidth(field.Field),
      sortable: true,
      isSticky: false
    })
  })

  // Registered date (API creationTime) — last column before status / checked-in
  columns.push({
    key: 'creationTime',
    label: 'Registered Date',
    type: 'text',
    fallback: '-',
    width: 120,
    sortable: true,
    isSticky: false
  })

  // Add sticky columns at the end
  STICKY_COLUMNS.forEach((key) => {
    const existingField = config.find(f => f.Field === key)
    
    columns.push({
      key,
      label: existingField?.Label || getDefaultLabel(key),
      type: existingField?.Type || 'text',
      fallback: key === 'registrationStatus' ? 'registered' : '-',
      width: 130,
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
  const labels: Record<string, string> = {
    creationTime: 'Registered Date',
    registrationStatus: 'RSVP Status',
    checkedIn: 'Checked In',
    campaignId: 'Campaign',
    email: 'Email',
    mobilePhone: 'Phone',
    companyName: 'Company',
    jobTitle: 'Job Title',
    industry: 'Industry',
    countryRegion: 'Country/Region'
  }
  return labels[key] || camelToSentenceCase(key)
}

/**
 * Get suggested column width based on field type/name
 */
function getColumnWidth(fieldKey: string): number {
  // Email fields need more space
  if (fieldKey === 'email') return 250
  
  // Phone numbers
  if (fieldKey.toLowerCase().includes('phone')) return 150
  
  // Company/org names
  if (fieldKey.toLowerCase().includes('company') || fieldKey.toLowerCase().includes('organization')) return 200
  
  // Default width
  return 150
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
  return [
    { key: 'name', label: 'Name', type: 'text', fallback: '-', width: 200, sortable: true },
    { key: 'email', label: 'Email', type: 'text', fallback: '-', width: 250, sortable: true },
    { key: 'mobilePhone', label: 'Phone', type: 'text', fallback: '-', width: 150, sortable: true },
    { key: 'companyName', label: 'Company', type: 'text', fallback: '-', width: 200, sortable: true },
    { key: 'creationTime', label: 'Registered Date', type: 'text', fallback: '-', width: 120, sortable: true, isSticky: false },
    { key: 'registrationStatus', label: 'RSVP Status', type: 'text', fallback: 'registered', width: 130, sortable: true, isSticky: true },
    { key: 'checkedIn', label: 'Checked In', type: 'text', fallback: '-', width: 130, sortable: true, isSticky: true }
  ]
}

export default useRsvpConfig

