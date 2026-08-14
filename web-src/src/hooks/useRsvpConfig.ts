/*
* <license header>
*/

import { useState, useEffect, useCallback, useRef } from 'react'
import { configService } from '../services/configService'
import { cachedApi } from '../services/api'
import { apiCache } from '../services/cacheUtils'
import { hasRsvpConfig } from '../config/externalConfigs'
import { hasRsvpSlice } from '../types/configApi'
import type { RsvpFormField } from '../types/configApi'
import type { AttendeeColumnConfig } from '../types/attendee'
import { mapLegacyRsvpConfigToFormFields } from '../utils/rsvpFieldDefinitions'

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
 * Transform RSVP form fields (scope config or legacy-JSON-normalized) to column definitions
 */
function transformFormFieldsToColumns(fields: RsvpFormField[]): AttendeeColumnConfig[] {
  // Filter out invalid fields
  const validFields = fields.filter(f =>
    f.field &&
    f.field.trim() !== '' &&
    !NAME_FIELDS.includes(f.field) &&
    !RESERVED_ATTENDEE_FIELDS.includes(f.field) &&
    !STICKY_COLUMNS.includes(f.field)
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
      key: field.field,
      label: field.label?.trim() || camelToSentenceCase(field.field),
      type: field.type || 'text',
      fallback: '-',
      width: getColumnWidth(field.field),
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
    const existingField = fields.find(f => f.field === key)

    columns.push({
      key,
      label: existingField?.label || getDefaultLabel(key),
      type: existingField?.type || 'text',
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
  rawConfig: RsvpFormField[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook for fetching and managing RSVP configuration
 * Transforms config into column definitions for the attendee table
 *
 * Resolves the event's own scoped RSVP config first (org/team scope config
 * via ESP, authored in Config Management), falling back to the legacy
 * per-cloud static JSON only for events whose scope has no RSVP config yet.
 *
 * @param eventId - The event to resolve scoped RSVP config for
 * @param cloudType - The cloud type to use for the legacy JSON fallback
 * @returns Column config, loading state, error, and refresh function
 */
export function useRsvpConfig(eventId: string | undefined, cloudType: string | undefined): UseRsvpConfigResult {
  const [columnConfig, setColumnConfig] = useState<AttendeeColumnConfig[]>([])
  const [rawConfig, setRawConfig] = useState<RsvpFormField[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guards against a slower stale request (e.g. from a fast event switch, or
  // an in-flight refresh()) overwriting the columns for what's now current.
  const requestIdRef = useRef(0)

  const loadConfig = useCallback(async () => {
    if (!eventId && !cloudType) {
      setColumnConfig([])
      setRawConfig([])
      return
    }

    const requestId = ++requestIdRef.current
    setIsLoading(true)
    setError(null)

    try {
      let fields: RsvpFormField[] = []

      if (eventId) {
        const result = await cachedApi.getEventConfigs(eventId)
        if (requestIdRef.current !== requestId) return
        if (!('error' in result)) {
          const scopeConfig = result.find(c => hasRsvpSlice(c)) ?? null
          if (scopeConfig && hasRsvpSlice(scopeConfig)) {
            fields = scopeConfig.rsvp.rsvpFormFields
          }
        } else {
          console.warn('Event configs request failed; falling back to legacy JSON if available.', result)
        }
      }

      if (fields.length === 0 && cloudType && hasRsvpConfig(cloudType)) {
        const legacyRows = await configService.getRsvpConfig(cloudType)
        if (requestIdRef.current !== requestId) return
        fields = mapLegacyRsvpConfigToFormFields(legacyRows)
      }

      if (requestIdRef.current !== requestId) return

      if (fields.length === 0) {
        console.warn(`No RSVP config found for event: ${eventId}, cloud type: ${cloudType}`)
        setColumnConfig(getDefaultColumns())
        setRawConfig([])
      } else {
        setRawConfig(fields)
        setColumnConfig(transformFormFieldsToColumns(fields))
      }
    } catch (err) {
      if (requestIdRef.current !== requestId) return
      console.error('Failed to load RSVP config:', err)
      setError('Failed to load field configuration')
      // Fall back to default columns on error
      setColumnConfig(getDefaultColumns())
      setRawConfig([])
    } finally {
      if (requestIdRef.current === requestId) setIsLoading(false)
    }
  }, [eventId, cloudType])

  // Load config when eventId/cloudType changes
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Refresh function for manual reload
  const refresh = useCallback(async () => {
    configService.clearCache()
    if (eventId) {
      apiCache.invalidate(eventId)
    }
    await loadConfig()
  }, [eventId, loadConfig])

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
