/*
* <license header>
*/

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
// @ts-ignore - uuid types not installed
import { v4 as uuidv4 } from 'uuid'
import { Dashboard, Widget } from '../types/dashboard'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import {
  loadDashboards,
  saveDashboards,
  isAtDashboardCap,
  MAX_DASHBOARDS_PER_USER,
} from '../utils/dashboardPersistence'

// ============================================================================
// TYPES
// ============================================================================

interface DashboardState {
  dashboards: Dashboard[]
  activeDashboardId: string | null
  isLoaded: boolean
}

type DashboardAction =
  | { type: 'LOAD'; payload: Dashboard[] }
  | { type: 'CREATE'; payload: Dashboard }
  | { type: 'RENAME'; payload: { id: string; name: string } }
  | { type: 'DELETE'; payload: { id: string } }
  | { type: 'DUPLICATE'; payload: { newDashboard: Dashboard } }
  | { type: 'SET_ACTIVE'; payload: { id: string | null } }
  | { type: 'ADD_WIDGET'; payload: { dashboardId: string; widget: Widget } }
  | { type: 'UPDATE_WIDGET'; payload: { dashboardId: string; widget: Widget } }
  | { type: 'REMOVE_WIDGET'; payload: { dashboardId: string; widgetId: string } }
  | { type: 'REORDER_WIDGET'; payload: { dashboardId: string; widgetId: string; direction: 'up' | 'down' } }

export interface DashboardContextValue {
  dashboards: Dashboard[]
  activeDashboard: Dashboard | null
  activeDashboardId: string | null
  isAtCap: boolean
  isLoaded: boolean
  maxDashboards: number
  createDashboard: (name: string) => Dashboard | null
  renameDashboard: (id: string, name: string) => void
  deleteDashboard: (id: string) => void
  duplicateDashboard: (id: string) => Dashboard | null
  setActiveDashboard: (id: string | null) => void
  addWidget: (dashboardId: string, widget: Omit<Widget, 'id'>) => void
  updateWidget: (dashboardId: string, widget: Widget) => void
  removeWidget: (dashboardId: string, widgetId: string) => void
  moveWidget: (dashboardId: string, widgetId: string, direction: 'up' | 'down') => void
}

// ============================================================================
// REDUCER
// ============================================================================

function withDashboard(
  dashboards: Dashboard[],
  id: string,
  update: (dashboard: Dashboard) => Dashboard
): Dashboard[] {
  return dashboards.map((dashboard) => (dashboard.id === id ? update(dashboard) : dashboard))
}

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'LOAD':
      return {
        ...state,
        dashboards: action.payload,
        activeDashboardId: action.payload[0]?.id ?? null,
        isLoaded: true,
      }

    case 'CREATE':
      return {
        ...state,
        dashboards: [...state.dashboards, action.payload],
        activeDashboardId: action.payload.id,
      }

    case 'RENAME':
      return {
        ...state,
        dashboards: withDashboard(state.dashboards, action.payload.id, (dashboard) => ({
          ...dashboard,
          name: action.payload.name,
          updatedAt: Date.now(),
        })),
      }

    case 'DELETE': {
      const remaining = state.dashboards.filter((dashboard) => dashboard.id !== action.payload.id)
      const wasActive = state.activeDashboardId === action.payload.id
      return {
        ...state,
        dashboards: remaining,
        activeDashboardId: wasActive ? remaining[0]?.id ?? null : state.activeDashboardId,
      }
    }

    case 'DUPLICATE':
      return {
        ...state,
        dashboards: [...state.dashboards, action.payload.newDashboard],
        activeDashboardId: action.payload.newDashboard.id,
      }

    case 'SET_ACTIVE':
      return { ...state, activeDashboardId: action.payload.id }

    case 'ADD_WIDGET':
      return {
        ...state,
        dashboards: withDashboard(state.dashboards, action.payload.dashboardId, (dashboard) => ({
          ...dashboard,
          widgets: [...dashboard.widgets, action.payload.widget],
          updatedAt: Date.now(),
        })),
      }

    case 'UPDATE_WIDGET':
      return {
        ...state,
        dashboards: withDashboard(state.dashboards, action.payload.dashboardId, (dashboard) => ({
          ...dashboard,
          widgets: dashboard.widgets.map((widget) =>
            widget.id === action.payload.widget.id ? action.payload.widget : widget
          ),
          updatedAt: Date.now(),
        })),
      }

    case 'REMOVE_WIDGET':
      return {
        ...state,
        dashboards: withDashboard(state.dashboards, action.payload.dashboardId, (dashboard) => ({
          ...dashboard,
          widgets: dashboard.widgets.filter((widget) => widget.id !== action.payload.widgetId),
          updatedAt: Date.now(),
        })),
      }

    case 'REORDER_WIDGET':
      return {
        ...state,
        dashboards: withDashboard(state.dashboards, action.payload.dashboardId, (dashboard) => {
          const index = dashboard.widgets.findIndex((widget) => widget.id === action.payload.widgetId)
          const swapWith = action.payload.direction === 'up' ? index - 1 : index + 1
          if (index < 0 || swapWith < 0 || swapWith >= dashboard.widgets.length) return dashboard

          const widgets = [...dashboard.widgets]
          ;[widgets[index], widgets[swapWith]] = [widgets[swapWith], widgets[index]]
          return { ...dashboard, widgets, updatedAt: Date.now() }
        }),
      }

    default:
      return state
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined)

interface DashboardProviderProps {
  children: React.ReactNode
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children }) => {
  const { ims } = useAuth()
  const toast = useToast()
  const email = ims.profile?.email?.toLowerCase().trim() || ''

  const [state, dispatch] = useReducer(dashboardReducer, {
    dashboards: [],
    activeDashboardId: null,
    isLoaded: false,
  })

  // Load whenever the resolved IMS email changes (e.g. dev-mode identity switch)
  useEffect(() => {
    if (!email) return
    dispatch({ type: 'LOAD', payload: loadDashboards(email) })
  }, [email])

  // Debounce-save after the initial load completes, so we never clobber
  // storage with the empty default state before load has run.
  useEffect(() => {
    if (!email || !state.isLoaded) return
    const timeoutId = setTimeout(() => {
      saveDashboards(email, state.dashboards)
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [email, state.isLoaded, state.dashboards])

  const isAtCap = isAtDashboardCap(state.dashboards)

  const createDashboard = useCallback(
    (name: string): Dashboard | null => {
      if (isAtDashboardCap(state.dashboards)) {
        toast.error(`You can have up to ${MAX_DASHBOARDS_PER_USER} dashboards. Delete one to create another.`)
        return null
      }
      const now = Date.now()
      const dashboard: Dashboard = { id: uuidv4(), name, createdAt: now, updatedAt: now, widgets: [] }
      dispatch({ type: 'CREATE', payload: dashboard })
      return dashboard
    },
    [state.dashboards, toast]
  )

  const renameDashboard = useCallback((id: string, name: string) => {
    dispatch({ type: 'RENAME', payload: { id, name } })
  }, [])

  const deleteDashboard = useCallback((id: string) => {
    dispatch({ type: 'DELETE', payload: { id } })
  }, [])

  const duplicateDashboard = useCallback(
    (id: string): Dashboard | null => {
      if (isAtDashboardCap(state.dashboards)) {
        toast.error(`You can have up to ${MAX_DASHBOARDS_PER_USER} dashboards. Delete one to create another.`)
        return null
      }
      const source = state.dashboards.find((dashboard) => dashboard.id === id)
      if (!source) return null

      const now = Date.now()
      const newDashboard: Dashboard = {
        ...source,
        id: uuidv4(),
        name: `${source.name} (copy)`,
        createdAt: now,
        updatedAt: now,
        widgets: source.widgets.map((widget) => ({ ...widget, id: uuidv4() })),
      }
      dispatch({ type: 'DUPLICATE', payload: { newDashboard } })
      return newDashboard
    },
    [state.dashboards, toast]
  )

  const setActiveDashboard = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE', payload: { id } })
  }, [])

  const addWidget = useCallback((dashboardId: string, widget: Omit<Widget, 'id'>) => {
    dispatch({ type: 'ADD_WIDGET', payload: { dashboardId, widget: { ...widget, id: uuidv4() } } })
  }, [])

  const updateWidget = useCallback((dashboardId: string, widget: Widget) => {
    dispatch({ type: 'UPDATE_WIDGET', payload: { dashboardId, widget } })
  }, [])

  const removeWidget = useCallback((dashboardId: string, widgetId: string) => {
    dispatch({ type: 'REMOVE_WIDGET', payload: { dashboardId, widgetId } })
  }, [])

  const moveWidget = useCallback((dashboardId: string, widgetId: string, direction: 'up' | 'down') => {
    dispatch({ type: 'REORDER_WIDGET', payload: { dashboardId, widgetId, direction } })
  }, [])

  const activeDashboard = useMemo(
    () => state.dashboards.find((dashboard) => dashboard.id === state.activeDashboardId) ?? null,
    [state.dashboards, state.activeDashboardId]
  )

  const value: DashboardContextValue = useMemo(
    () => ({
      dashboards: state.dashboards,
      activeDashboard,
      activeDashboardId: state.activeDashboardId,
      isAtCap,
      isLoaded: state.isLoaded,
      maxDashboards: MAX_DASHBOARDS_PER_USER,
      createDashboard,
      renameDashboard,
      deleteDashboard,
      duplicateDashboard,
      setActiveDashboard,
      addWidget,
      updateWidget,
      removeWidget,
      moveWidget,
    }),
    [
      state.dashboards,
      activeDashboard,
      state.activeDashboardId,
      isAtCap,
      state.isLoaded,
      createDashboard,
      renameDashboard,
      deleteDashboard,
      duplicateDashboard,
      setActiveDashboard,
      addWidget,
      updateWidget,
      removeWidget,
      moveWidget,
    ]
  )

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
}

// ============================================================================
// HOOK
// ============================================================================

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
