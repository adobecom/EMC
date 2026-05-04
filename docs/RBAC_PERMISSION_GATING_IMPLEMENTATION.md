# RBAC Permission Gating — Implementation Plan

**PR:** #69 (`initial-q` → `ai-pod-rbac-main`)
**Date:** 2026-03-23

---

## 1. Overview

This PR adds client-side permission gating so that navigation elements, dashboard content, and admin UI are shown or hidden based on the active group's RBAC role permissions. It also fixes error handling in the Cloud Management Console and resolves a race condition in group/role resolution.

---

## 2. Permission Model

### 2.1 Permission Format

Permissions are strings in the format `resource:access` with wildcard support:

| Pattern | Meaning |
|---|---|
| `*:*` | Full access (all resources, all actions) |
| `event:*` | All actions on events |
| `*:read` | Read access on all resources |
| `event:read` | Read access on events only |

### 2.2 Resource-to-UI Mapping

| Permission Required | UI Elements Gated |
|---|---|
| `event:read` | TopNav: Events, Registrations, Speakers tabs. Home: Events, Registrations, Speakers cards. Overview: Total Events, Published Events, Total Attendees stat cards; Events by Type, Events by Cloud sections; Template Breakdown; Quick Actions (create event, view events) |
| `series:read` | TopNav: Series tab. Home: Series card. Overview: Total Series stat card; Series by Status section; Quick Action (create series) |
| `cloud:read` | TopNav: Clouds tab. Home: Clouds card |
| `scope:read` OR `group:read` | UserPanel menu: "Access Management" item |
| `role:read` | UserPanel menu: "Roles" item |
| _(none / always visible)_ | TopNav: Home, Overview, About. Home: Overview, Documentation cards. Overview: page header, refresh button |

### 2.3 Fallback When Role Cannot Be Read

When `GET /v1/roles/{roleId}` returns **403** (user lacks `role:read`), the frontend falls back to domain-only permissions:

```
event:*, series:*, session:*, cloud:*, config:*, integration:*
```

This means:
- All domain tabs/cards/data are visible
- Admin UI (Roles, Access Management) is hidden
- The API still enforces real permissions server-side

---

## 3. Components Changed

### 3.1 GroupContext (`web-src/src/contexts/GroupContext.tsx`) — NEW

Central RBAC state manager. On app mount:
1. Fetches user groups via `GET /v1/users/me/groups`
2. Selects active group (from sessionStorage, auto-select if single, or prompts user)
3. Fetches role via `GET /v1/roles/{roleId}` (with 403 fallback)
4. Exposes `permissions: Set<RBACPermission>` and `groupVersion: number`

**Key behaviors:**
- `groupVersion` increments on group switch — dashboards use this as a `useEffect` dependency to re-fetch data
- Role is resolved **before** `groupVersion` is bumped (prevents race condition where dashboards fetch with stale permissions)
- Cache is cleared on group switch (`clearAllCaches()`, `clearAllEnrichmentCaches()`)
- Selection persisted to `sessionStorage` key `emc_active_group_id`

### 3.2 useHasPermission (`web-src/src/hooks/useHasPermission.ts`) — NEW

Permission checking hooks:

| Hook | Logic |
|---|---|
| `useHasPermission(resource, access)` | Single check with wildcard matching |
| `useHasAnyPermission(checks)` | OR — true if any check passes |
| `useHasAllPermissions(checks)` | AND — true if all checks pass |
| `checkPermission(permissions, resource, access)` | Pure function (non-hook), used in filters |

Wildcard matching order: `*:*` → exact → `resource:*` → `*:access` → scope-type qualification.

### 3.3 useRBACFilter (`web-src/src/hooks/useRBACFilter.ts`) — MODIFIED

Returns filter functions that return data or `[]` based on permissions:
- `filterEvents()` — requires `event:read`
- `filterSeries()` — requires `series:read`
- `filterClouds()` — requires `cloud:read`

Used by: EventsDashboard, SeriesDashboard, SpeakersDashboard, OverviewDashboard, Registrations, CloudManagementConsole.

### 3.4 TopNav (`web-src/src/components/layout/TopNav.tsx`) — MODIFIED

Tabs conditionally rendered:
- `{canReadEvents && <NavLink to="/events">}` (also Registrations, Speakers)
- `{canReadSeries && <NavLink to="/series">}`
- `{canReadClouds && <NavLink to="/clouds">}`
- Home, Overview, About — always rendered

### 3.5 Home Page (`web-src/src/pages/Home.tsx`) — MODIFIED

Each `NavDestination` now has an optional `permission` field:
```typescript
{ resource: 'event', access: 'read' }
```

Cards are filtered at render time using `checkPermission()` against the active group's permissions. Cards without a `permission` field (Overview, Documentation) are always shown.

### 3.6 OverviewDashboard (`web-src/src/pages/OverviewDashboard/OverviewDashboard.tsx`) — MODIFIED

- Stat cards, distribution sections, and quick action buttons wrapped in `{canReadEvents && ...}` or `{canReadSeries && ...}`
- Secondary stats container and Quick Actions container hidden entirely when user has neither permission
- `loadData()` skips API calls when user lacks the corresponding permission: `canReadEvents ? cachedApi.getEventsList() : Promise.resolve([])`
- StatCard `<div>` now has `role="button"`, `tabIndex={0}`, and `onKeyDown` for keyboard accessibility

### 3.7 CloudManagementConsole (`web-src/src/pages/CloudManagementConsole/CloudManagementConsole.tsx`) — MODIFIED

Error handling rewritten to match project patterns:
- **Load error screen:** Replaced `Well` + red text with centered `Heading` + `Text` + `ActionButton` with Refresh icon (matches OverviewDashboard)
- **Error condition:** Changed from `if (error && clouds.length === 0)` to `if (error)`
- **Save errors:** Now use `toast.error()` instead of `setError()` (which was invisible when clouds were loaded)
- **Save success:** Replaced custom inline toast with `toast.success()` from shared ToastContext
- **Error message:** Fixed `[object Object]` by using plain string `'Failed to load clouds data'` instead of interpolating the error object
- Removed: `Well` import, `toastMessage` state, custom toast styles, custom toast JSX

### 3.8 UserPanel (`web-src/src/components/user/UserPanel.tsx`) — MODIFIED

- Added group switching section (lists groups with checkmark on active)
- Added administration section gated on permissions:
  - "Access Management" — visible when `scope:read` OR `group:read`
  - "Roles" — visible when `role:read`

### 3.9 RBACGate (`web-src/src/components/RBACGate.tsx`) — MODIFIED

Three gate states before app renders:
1. **Loading** — spinner while groups fetch
2. **Access Denied** — no groups or error, with retry button
3. **Group Selection** — picker when user has multiple groups

Fixed: replaced raw CSS flex with Spectrum `<Flex>` component; added UNSAFE_style comments.

### 3.10 RoleManagement (`web-src/src/pages/RoleManagement/RoleManagement.tsx`) — MODIFIED

- Actions column: added `justifyContent="end"` to match other dashboards
- Fixed `as any` cast: replaced with proper type narrowing `(result as { error: { message?: string } })`

### 3.11 API Service (`web-src/src/services/api.ts`) — MODIFIED

- Added RBAC endpoints: `getMyGroups`, `getRoleById`, `getRoles`, `createRole`, `updateRole`, `deleteRole`, `getScopes`, `createScope`, `updateScope`, `deleteScope`, `getGroupsForScope`, `createGroup`, `updateGroup`, `deleteGroup`, `getGroupUsers`, `addGroupUser`, `removeGroupUser`, `updateGroupUser`, `getPermissionsList`
- Added `x-adobe-esp-group-id` header injection for ESP requests (when `activeGroupId` is set)
- Added `setGroupId()` and `setOnStaleGroup()` methods
- Added 403 stale-group recovery with 5s cooldown
- Fixed `as any` cast on `constructRequestHeaders` with explanatory comment

---

## 4. Data Flow

```
App Mount
  → GroupProvider fetches GET /v1/users/me/groups
  → If 1 group: auto-select → fetchRole → setPermissions → bump groupVersion
  → If N groups: show GroupSelectionScreen → user picks → same flow
  → RBACGate unblocks rendering

Dashboard Mount (triggered by groupVersion)
  → useEffect([groupVersion]) fires
  → loadData() runs
  → cachedApi.getEventsList() / getSeriesList()
  → filterEvents(data) / filterSeries(data) applies RBAC filter
  → setEvents(filtered)

TopNav / Home / Overview render
  → useHasPermission('event', 'read') etc.
  → Conditionally render tabs / cards / sections

Group Switch (via UserPanel menu)
  → selectGroup(newGroup)
  → apiService.setGroupId(newGroupId)
  → clearAllCaches()
  → fetchRole(newGroup.roleId) → setActiveRole → permissions update
  → setGroupVersion(v+1) → dashboards re-fetch
```

---

## 5. QA Test Scenarios

### 5.1 Role: Full Admin (`*:*`)

| Test | Expected |
|---|---|
| TopNav tabs | All 8 tabs visible (Home, Overview, Events, Registrations, Speakers, Series, Clouds, About) |
| Home page cards | All 7 cards visible |
| Overview dashboard | All stat cards, all distribution sections, all quick actions visible |
| UserPanel menu | "Administration" section visible with both "Access Management" and "Roles" |
| Cloud Console | Loads normally, save works, toast notifications appear |

### 5.2 Role: Domain User (`event:*`, `series:read`, `session:*`, `cloud:read` — NO `role:read`)

| Test | Expected |
|---|---|
| Role fetch | Console warns "Cannot read role (no role:read permission)" — falls back to domain permissions |
| TopNav tabs | Events, Registrations, Speakers, Series, Clouds visible; Home, Overview, About always visible |
| Home page cards | Events, Registrations, Speakers, Series, Clouds, Overview, Documentation cards visible |
| UserPanel menu | "Administration" section **NOT** visible (no `role:read`, `scope:read`, or `group:read`) |
| Overview dashboard | All stat cards and sections visible (event + series permissions) |

### 5.3 Role: Events Only (`event:read`)

| Test | Expected |
|---|---|
| TopNav tabs | Events, Registrations, Speakers visible; Series, Clouds hidden |
| Home page cards | Events, Registrations, Speakers visible; Series, Clouds hidden; Overview, Documentation always visible |
| Overview stat cards | Total Events, Total Attendees, Published Events visible; Total Series hidden |
| Overview distributions | Events by Type, Events by Cloud, Template Breakdown visible; Series by Status hidden |
| Overview quick actions | Create In-Person Event, Create Webinar, View All Events visible; Create Series hidden |
| Data fetching | `getSeriesList()` NOT called (skipped when `!canReadSeries`) |

### 5.4 Role: Series Only (`series:read`)

| Test | Expected |
|---|---|
| TopNav tabs | Series visible; Events, Registrations, Speakers, Clouds hidden |
| Home page cards | Series visible; Events, Registrations, Speakers, Clouds hidden |
| Overview stat cards | Total Series visible; Total Events, Total Attendees, Published Events hidden |
| Overview distributions | Series by Status visible; Events by Type, Events by Cloud, Template Breakdown hidden |
| Overview quick actions | Create Series visible; all event actions hidden |

### 5.5 Role: No Domain Permissions (e.g., only `scope:read`, `group:read`)

| Test | Expected |
|---|---|
| TopNav tabs | Only Home, Overview, About visible |
| Home page cards | Only Overview, Documentation visible |
| Overview dashboard | Header + refresh visible; no stat cards, no distribution sections, no quick actions |
| UserPanel menu | "Administration" section visible with "Access Management" |

### 5.6 Cloud Management Console Error Handling

| Test | Expected |
|---|---|
| Load failure (API error) | Centered error screen: "Error Loading Cloud Management" heading, error message text, Retry button with refresh icon |
| Save failure | Toast notification (red) with error message — not silent |
| Save success | Toast notification (green) "Changes saved successfully!" via shared ToastContext |
| No error message `[object Object]` | Error uses plain string "Failed to load clouds data" |

### 5.7 Group Switching

| Test | Expected |
|---|---|
| Switch group via UserPanel | All caches cleared, role re-fetched, dashboards re-load with new group's data |
| Permissions update immediately | No stale tabs/cards from previous group |
| sessionStorage persistence | Reload page → same group selected |
| Multiple groups on login | GroupSelectionScreen shown with Picker; "Continue" disabled until group selected |
| Single group on login | Auto-selected, no prompt |

### 5.8 Keyboard Accessibility

| Test | Expected |
|---|---|
| StatCard on Overview | Tab-focusable, Enter/Space activates navigation |
| StatCard without onClick | Not focusable (no role, no tabIndex) |

---

## 6. Files Reference

| Category | Files |
|---|---|
| **Core RBAC** | `contexts/GroupContext.tsx`, `hooks/useHasPermission.ts`, `hooks/useRBACFilter.ts`, `types/rbacApi.ts` |
| **Gate** | `components/RBACGate.tsx`, `components/shared/GateScreen.tsx` |
| **Navigation gating** | `components/layout/TopNav.tsx`, `pages/Home.tsx` |
| **Dashboard gating** | `pages/OverviewDashboard/OverviewDashboard.tsx` |
| **Error handling** | `pages/CloudManagementConsole/CloudManagementConsole.tsx` |
| **Admin UI** | `components/user/UserPanel.tsx`, `pages/RoleManagement/RoleManagement.tsx`, `pages/ScopeGroupManagement/ScopeGroupManagement.tsx`, `pages/UserManagement/UserManagement.tsx` |
| **API layer** | `services/api.ts`, `services/requestHelpers.ts` |
| **Shared** | `components/shared/RequirePermission.tsx`, `components/shared/GroupSwitcher.tsx` |
