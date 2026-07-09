/* 
* <license header>
*/

import { EventFormData } from '../types/domain'

/**
 * Session storage utilities for persisting form drafts
 * 
 * This allows users to:
 * - Navigate between form steps without losing data
 * - Resume editing if they accidentally close the tab
 * - Keep their work if the page refreshes
 * 
 * Data is stored in sessionStorage (cleared when browser closes)
 */

export const STORAGE_KEY_PREFIX = 'emc-event-form-draft-'

/**
 * Generate the storage key for a form draft
 * @param eventIdOrKey - Event ID for edits, or a descriptive key for new events
 */
function getStorageKey(eventIdOrKey: string): string {
  return `${STORAGE_KEY_PREFIX}${eventIdOrKey}`
}

/**
 * Save form data to session storage
 * @param eventIdOrKey - Event ID or key to save under
 * @param formData - The form data to persist
 */
export function saveFormDraft(eventIdOrKey: string, formData: EventFormData): void {
  try {
    const key = getStorageKey(eventIdOrKey)
    const dataToStore = {
      formData,
      savedAt: Date.now(),
      version: 1 // For future migrations if data shape changes
    }
    sessionStorage.setItem(key, JSON.stringify(dataToStore))
  } catch (error) {
    // Session storage might be full or disabled
    console.warn('Failed to save form draft to session storage:', error)
  }
}

/**
 * Load form data from session storage
 * @param eventIdOrKey - Event ID or key to load
 * @returns The saved form data, or null if not found
 */
export function loadFormDraft(eventIdOrKey: string): EventFormData | null {
  try {
    const key = getStorageKey(eventIdOrKey)
    const stored = sessionStorage.getItem(key)
    
    if (!stored) {
      return null
    }
    
    const parsed = JSON.parse(stored)
    
    // Validate structure
    if (!parsed.formData || typeof parsed.formData !== 'object') {
      console.warn('Invalid form draft structure, discarding')
      sessionStorage.removeItem(key)
      return null
    }
    
    return parsed.formData as EventFormData
  } catch (error) {
    console.warn('Failed to load form draft from session storage:', error)
    return null
  }
}

/**
 * Clear a specific form draft from session storage
 * @param eventIdOrKey - Event ID or key to clear
 */
export function clearFormDraft(eventIdOrKey: string): void {
  try {
    const key = getStorageKey(eventIdOrKey)
    sessionStorage.removeItem(key)
  } catch (error) {
    console.warn('Failed to clear form draft from session storage:', error)
  }
}

/**
 * Clear all form drafts from session storage
 * Useful for cleanup or logout scenarios
 */
export function clearAllFormDrafts(): void {
  try {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => sessionStorage.removeItem(key))
  } catch (error) {
    console.warn('Failed to clear all form drafts from session storage:', error)
  }
}

/**
 * Check if a form draft exists in session storage
 * @param eventIdOrKey - Event ID or key to check
 * @returns true if a draft exists
 */
export function hasFormDraft(eventIdOrKey: string): boolean {
  try {
    const key = getStorageKey(eventIdOrKey)
    return sessionStorage.getItem(key) !== null
  } catch (error) {
    return false
  }
}

/**
 * Get the timestamp when a draft was last saved
 * @param eventIdOrKey - Event ID or key to check
 * @returns Unix timestamp (ms) or null if no draft
 */
export function getDraftTimestamp(eventIdOrKey: string): number | null {
  try {
    const key = getStorageKey(eventIdOrKey)
    const stored = sessionStorage.getItem(key)
    
    if (!stored) {
      return null
    }
    
    const parsed = JSON.parse(stored)
    return parsed.savedAt || null
  } catch (error) {
    return null
  }
}

/**
 * Get all stored draft keys (without the prefix)
 * @returns Array of event IDs or keys that have drafts
 */
export function getAllDraftKeys(): string[] {
  const keys: string[] = []
  
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        keys.push(key.slice(STORAGE_KEY_PREFIX.length))
      }
    }
  } catch (error) {
    console.warn('Failed to list form drafts from session storage:', error)
  }
  
  return keys
}

