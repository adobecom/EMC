/**
 * RBAC (Role-Based Access Control) type definitions
 */

export type UserRole = 'admin' | 'manager' | 'creator' | 'editor'

export interface RBACUser {
  email: string
  role: UserRole
  businessUnits: string[]
  series: string[]
  events: string[]
}

export interface RBACScope {
  cloudTypes: Set<string>
  seriesIds: Set<string>
  eventIds: Set<string>
}

export interface RBACContextValue {
  /** Current user's RBAC record (undefined if not found in users.json) */
  currentUser: RBACUser | undefined
  /** Whether the current user has admin role */
  isAdmin: boolean
  /** Whether RBAC data is still being resolved */
  isLoading: boolean
  /** Whether the current user exists in the users list */
  hasAccess: boolean
  /** The resolved scope for the current user */
  scope: RBACScope
  /** Check if user can access a specific event */
  canAccessEvent: (event: { eventId?: string; seriesId?: string; cloudType?: string }) => boolean
  /** Check if user can access a specific series */
  canAccessSeries: (series: { seriesId?: string; cloudType?: string }) => boolean
  /** All users — only populated for admins */
  allUsers: RBACUser[]
  /** Refresh users list from GitHub (for admin UI) */
  refreshUsers: () => Promise<void>
}
