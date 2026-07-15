/*
* <license header>
*/

/**
 * IntegrationsDashboard - Webhook Integrations Hub
 *
 * Self-service webhook configurator: admins configure a webhook against a
 * resource+trigger (e.g. `event.update`), optional conditions, a payload
 * shape, a connection/auth config, and a retry policy. ESP fires webhooks
 * automatically and logs every delivery attempt (see DeliveriesDashboard for
 * the jobs/delivery-log view with redeliver).
 *
 * Integrations are scope-scoped (`/v1/scopes/{scopeId}/integrations`), so
 * this page reuses ConfigManagement's scope-picker pattern (a searchable
 * ComboBox over `RBACApiScope[]`) rather than the series-selector used by
 * SpeakersDashboard.
 */

import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ActionButton,
  Button,
  MenuTrigger,
  Menu,
  Text,
  DialogTrigger,
  AlertDialog,
  Badge,
  ComboBox,
  ComboBoxItem,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Add from '@react-spectrum/s2/icons/Add'
import More from '@react-spectrum/s2/icons/More'
import RotateCCW from '@react-spectrum/s2/icons/RotateCCW'
import PluginIllustration from '@react-spectrum/s2/illustrations/linear/Plugin'
import { TableColumn } from '../../components/shared/DataTable'
import { StatusBadge, ResourceDashboardLayout, BlurredLoadingOverlay } from '../../components/shared'
import { apiService, cachedApi } from '../../services/api'
import { IMS } from '../../types'
import type { RBACApiScope, ScopeType } from '../../types/rbacApi'
import type { IntegrationApiResponse, IntegrationSummary, IntegrationDashboardItem, IntegrationWriteBody, DeliveryStatus } from '../../types/webhookApi'
import { useToast } from '../../contexts'
import { useSafeState } from '../../hooks'
import { useHasPermission } from '../../hooks/useHasPermission'
import { createShimmerStyle } from '../../styles/designSystem'
import { buildIntegrationManageActions } from './integrationManageActions'
import { IntegrationFormDialog } from './IntegrationFormDialog'

const INTEGRATIONS_SEARCH_KEYS = ['name', 'endpoint', 'triggerResource']

const INTEGRATIONS_DASHBOARD_TABLE_TEST_IDS = {
  root: 'integrations-dashboard-table',
  emptyState: 'integrations-dashboard-table-empty-state',
  pageInput: 'integrations-dashboard-table-page-input',
  header: (columnKey: string) => `integrations-dashboard-table-header-${columnKey}`,
  row: (itemKey: string) => `integrations-dashboard-table-row-${itemKey}`,
}

const SCOPE_TYPE_VARIANTS: Record<ScopeType, 'positive' | 'informative' | 'neutral'> = {
  platform: 'positive',
  org: 'informative',
  team: 'neutral',
}

/** Builds a dashboard row from the list endpoint's lightweight summary.
 *  `connectionType`/`conditionCount`/`endpoint`/timestamps aren't in the
 *  summary — they're filled in by `mergeIntegrationDetail` once the
 *  per-row GET-by-id enrichment resolves for a visible row. */
function toIntegrationDashboardItem(item: IntegrationSummary): IntegrationDashboardItem {
  return {
    integrationId: item.integrationId,
    scopeId: item.scopeId,
    name: item.name,
    enabled: item.enabled,
    triggerResource: item.trigger?.resource || '',
    triggerOperation: item.trigger?.operation || 'update',
  }
}

/** Merges a full `IntegrationApiResponse` (from the by-id enrichment fetch)
 *  into an existing dashboard row, populating the fields the summary omits. */
function mergeIntegrationDetail(item: IntegrationDashboardItem, raw: IntegrationApiResponse): IntegrationDashboardItem {
  return {
    ...item,
    connectionType: raw.connection?.type || 'generic',
    conditionCount: raw.conditions?.length || 0,
    endpoint: raw.action?.endpoint || '',
    creationTime: raw.creationTime,
    modificationTime: raw.modificationTime,
  }
}

/** Builds a full write body from an existing API response, for quick mutations
 *  (e.g. the enable/disable toggle) that don't go through the edit dialog.
 *  Secret values are intentionally omitted — ESP never returns them in
 *  plaintext, so a write body can only ever resend a *new* value for a
 *  secret; keys omitted here are left untouched server-side. */
function toWriteBody(item: IntegrationApiResponse, overrides?: Partial<IntegrationWriteBody>): IntegrationWriteBody {
  return {
    name: item.name,
    enabled: item.enabled,
    trigger: { ...item.trigger },
    conditions: item.conditions.map((c) => ({ ...c })),
    action: {
      endpoint: item.action.endpoint,
      data: {
        objects: [...item.action.data.objects],
        ...(item.action.data.transforms ? { transforms: item.action.data.transforms } : {}),
      },
    },
    connection: {
      type: item.connection.type,
      secrets: {},
      ...(item.connection.hmac ? { hmac: { ...item.connection.hmac } } : {}),
    },
    retryPolicy: {
      maxAttempts: item.retryPolicy.maxAttempts,
      backoffSeconds: [...item.retryPolicy.backoffSeconds],
    },
    ...overrides,
  }
}

interface IntegrationsDashboardProps {
  ims: IMS
}

export const IntegrationsDashboard: React.FC<IntegrationsDashboardProps> = () => {
  const toast = useToast()
  const navigate = useNavigate()
  const canWriteIntegration = useHasPermission('integration', 'write')
  const canDeleteIntegration = useHasPermission('integration', 'delete')

  // ── Scope selection ──
  const [scopes, setScopes] = useSafeState<RBACApiScope[]>([])
  const [selectedScopeId, setSelectedScopeId] = useSafeState<string | null>(null)
  const [scopeFilterText, setScopeFilterText] = useState('')
  const [isLoadingScopes, setIsLoadingScopes] = useSafeState(true)

  // ── Integrations data ──
  const [integrations, setIntegrations] = useSafeState<IntegrationDashboardItem[]>([])
  // Populated lazily by per-row GET-by-id enrichment — the list endpoint only
  // returns IntegrationSummary, so this map only ever holds rows that have
  // been visible at some point (or were fetched on-demand for edit/toggle).
  const [rawIntegrations, setRawIntegrations] = useSafeState<Map<string, IntegrationApiResponse>>(new Map())
  const [isLoading, setIsLoading] = useSafeState(false)
  const [error, setError] = useSafeState<string | null>(null)

  // ── Last-delivery-status enrichment (visible rows only) ──
  const [deliveryStatuses, setDeliveryStatuses] = useSafeState<Map<string, DeliveryStatus>>(new Map())
  const [loadingDeliveryStatus, setLoadingDeliveryStatus] = useSafeState<Set<string>>(new Set())

  // ── Full-detail enrichment (visible rows only) — fills connection/conditions/
  // endpoint/timestamps, which the summary list response doesn't include.
  const [loadingIntegrationDetail, setLoadingIntegrationDetail] = useSafeState<Set<string>>(new Set())

  // Mirrors the latest `rawIntegrations`/`selectedScopeId` for reads inside
  // callbacks that must NOT depend on them (depending on `rawIntegrations`
  // would recreate `loadIntegrations` — and thus re-trigger its mount effect —
  // on every enrichment tick; depending on `selectedScopeId` inside a
  // long-running mutation handler would let a scope switch mid-flight silently
  // redirect that handler's *reload* to the new scope).
  const rawIntegrationsRef = useRef(rawIntegrations)
  useEffect(() => { rawIntegrationsRef.current = rawIntegrations }, [rawIntegrations])
  const selectedScopeIdRef = useRef(selectedScopeId)
  useEffect(() => { selectedScopeIdRef.current = selectedScopeId }, [selectedScopeId])

  // ── Dialog / action state ──
  const [isFormOpen, setIsFormOpen] = useSafeState(false)
  const [editingIntegration, setEditingIntegration] = useSafeState<IntegrationApiResponse | null>(null)
  const [itemToDelete, setItemToDelete] = useSafeState<IntegrationDashboardItem | null>(null)
  const [actionInProgress, setActionInProgress] = useSafeState<string | null>(null)

  const selectedScope = useMemo(
    () => scopes.find((s) => s.scopeId === selectedScopeId) || null,
    [scopes, selectedScopeId]
  )

  const scopeItems = useMemo(() => scopes.map((s) => ({ id: s.scopeId, name: s.name, type: s.type })), [scopes])

  const filteredScopeItems = useMemo(() => {
    if (!scopeFilterText) return scopeItems
    const lower = scopeFilterText.toLowerCase()
    return scopeItems.filter((s) => s.name.toLowerCase().includes(lower) || s.type.toLowerCase().includes(lower))
  }, [scopeItems, scopeFilterText])

  // ── Load scopes ──
  useEffect(() => {
    const loadScopes = async () => {
      setIsLoadingScopes(true)
      try {
        const result = await apiService.getScopes()
        if (!('error' in result)) setScopes(result)
      } catch (err) {
        console.error('Error loading scopes:', err)
      } finally {
        setIsLoadingScopes(false)
      }
    }
    loadScopes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load integrations for the selected scope ──
  const loadIntegrations = useCallback(async () => {
    if (!selectedScopeId) {
      setIntegrations([])
      setRawIntegrations(new Map())
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await cachedApi.getIntegrations(selectedScopeId)
      if ('error' in result) {
        throw new Error(typeof result.error === 'string' ? result.error : 'Failed to load integrations')
      }
      // The list is a lightweight summary. Rows already enriched (still
      // present in `rawIntegrations`) keep showing their detail immediately —
      // dropping it here would flash every visible row's endpoint/conditions/
      // last-modified back to "not yet loaded" placeholders on every reload,
      // not just the row that actually changed. A mutation handler that wants
      // fresher detail for one specific row evicts it via `evictRawIntegration`
      // before calling this, so only that row re-enriches.
      const validIds = new Set(result.map((i) => i.integrationId))
      const preservedRaw = new Map<string, IntegrationApiResponse>()
      rawIntegrationsRef.current.forEach((raw, id) => {
        if (validIds.has(id)) preservedRaw.set(id, raw)
      })
      setRawIntegrations(preservedRaw)
      setIntegrations(result.map((summary) => {
        const base = toIntegrationDashboardItem(summary)
        const raw = preservedRaw.get(summary.integrationId)
        return raw ? mergeIntegrationDetail(base, raw) : base
      }))
    } catch (err) {
      console.error('Error loading integrations:', err)
      setError('Failed to load integrations')
    } finally {
      setIsLoading(false)
    }
  }, [selectedScopeId])

  useEffect(() => {
    loadIntegrations()
  }, [loadIntegrations])

  // ── Enrich visible rows with their most recent delivery status ──
  const enrichDeliveryStatuses = useCallback((visible: IntegrationDashboardItem[]) => {
    if (!selectedScopeId) return
    const toLoad = visible.filter((i) => !deliveryStatuses.has(i.integrationId) && !loadingDeliveryStatus.has(i.integrationId))
    if (toLoad.length === 0) return

    setLoadingDeliveryStatus((prev) => new Set([...prev, ...toLoad.map((i) => i.integrationId)]))

    Promise.all(
      toLoad.map(async (item) => {
        try {
          const result = await cachedApi.getDeliveries(selectedScopeId, item.integrationId)
          if ('error' in result || result.length === 0) return { id: item.integrationId, status: undefined }
          const latest = [...result].sort((a, b) => b.timestamp - a.timestamp)[0]
          return { id: item.integrationId, status: latest.status }
        } catch {
          return { id: item.integrationId, status: undefined }
        }
      })
    ).then((results) => {
      setDeliveryStatuses((prev) => {
        const next = new Map(prev)
        results.forEach(({ id, status }) => {
          if (status) next.set(id, status)
        })
        return next
      })
      setLoadingDeliveryStatus((prev) => {
        const next = new Set(prev)
        toLoad.forEach((i) => next.delete(i.integrationId))
        return next
      })
    })
  }, [selectedScopeId, deliveryStatuses, loadingDeliveryStatus])

  // ── Enrich visible rows with the full integration (connection/conditions/
  // endpoint/timestamps) — the list endpoint only returns IntegrationSummary. ──
  const enrichIntegrationDetail = useCallback((visible: IntegrationDashboardItem[]) => {
    if (!selectedScopeId) return
    const toLoad = visible.filter((i) => !rawIntegrations.has(i.integrationId) && !loadingIntegrationDetail.has(i.integrationId))
    if (toLoad.length === 0) return

    setLoadingIntegrationDetail((prev) => new Set([...prev, ...toLoad.map((i) => i.integrationId)]))

    Promise.all(
      toLoad.map(async (item) => {
        try {
          const result = await cachedApi.getIntegrationById(selectedScopeId, item.integrationId)
          return 'error' in result ? null : result
        } catch {
          return null
        }
      })
    ).then((results) => {
      const resolved = results.filter((r): r is IntegrationApiResponse => !!r)
      if (resolved.length > 0) {
        setRawIntegrations((prev) => {
          const next = new Map(prev)
          resolved.forEach((raw) => next.set(raw.integrationId, raw))
          return next
        })
        setIntegrations((prev) => prev.map((item) => {
          const raw = resolved.find((r) => r.integrationId === item.integrationId)
          return raw ? mergeIntegrationDetail(item, raw) : item
        }))
      }
      setLoadingIntegrationDetail((prev) => {
        const next = new Set(prev)
        toLoad.forEach((i) => next.delete(i.integrationId))
        return next
      })
    })
  }, [selectedScopeId, rawIntegrations, loadingIntegrationDetail])

  const handleVisibleItemsChange = useCallback((visible: IntegrationDashboardItem[]) => {
    if (visible.length === 0) return
    enrichDeliveryStatuses(visible)
    enrichIntegrationDetail(visible)
  }, [enrichDeliveryStatuses, enrichIntegrationDetail])

  /** Returns the full integration for a row, fetching it on-demand if the row
   *  hasn't been enriched yet (e.g. acted on before it scrolled into view). */
  const getOrFetchRawIntegration = useCallback(async (integrationId: string): Promise<IntegrationApiResponse | null> => {
    const cached = rawIntegrations.get(integrationId)
    if (cached) return cached
    if (!selectedScopeId) return null
    const result = await cachedApi.getIntegrationById(selectedScopeId, integrationId)
    if ('error' in result) return null
    setRawIntegrations((prev) => new Map(prev).set(integrationId, result))
    return result
  }, [rawIntegrations, selectedScopeId])

  /** Drops a row's cached detail (kept in sync via the ref so a same-tick
   *  `loadIntegrations()` — see its "preservedRaw" step — doesn't just carry
   *  the stale value forward) so it re-enriches with fresh data on the next
   *  reload, instead of `loadIntegrations` preserving a now-outdated value. */
  const evictRawIntegration = useCallback((integrationId: string) => {
    setRawIntegrations((prev) => {
      if (!prev.has(integrationId)) return prev
      const next = new Map(prev)
      next.delete(integrationId)
      rawIntegrationsRef.current = next
      return next
    })
  }, [])

  // ── Handlers ──
  const handleCreateIntegration = useCallback(() => {
    setEditingIntegration(null)
    setIsFormOpen(true)
  }, [])

  const handleEditIntegration = useCallback(async (item: IntegrationDashboardItem) => {
    setActionInProgress(item.integrationId)
    try {
      const raw = await getOrFetchRawIntegration(item.integrationId)
      if (!raw) {
        toast.error('Failed to load integration details')
        return
      }
      setEditingIntegration(raw)
      setIsFormOpen(true)
    } catch (err) {
      console.error('Error loading integration details:', err)
      toast.error('Failed to load integration details')
    } finally {
      setActionInProgress(null)
    }
  }, [getOrFetchRawIntegration, toast])

  const handleToggleEnabled = useCallback(async (item: IntegrationDashboardItem) => {
    const scopeId = selectedScopeId
    if (!scopeId) return
    setActionInProgress(item.integrationId)
    try {
      const raw = await getOrFetchRawIntegration(item.integrationId)
      if (!raw) {
        toast.error('Failed to load integration details')
        return
      }
      const result = await cachedApi.updateIntegration(scopeId, item.integrationId, toWriteBody(raw, { enabled: !raw.enabled }))
      if ('error' in result) {
        toast.error(`Failed to ${raw.enabled ? 'disable' : 'enable'} integration`)
      } else {
        toast.success(`Integration ${raw.enabled ? 'disabled' : 'enabled'}`)
        evictRawIntegration(item.integrationId)
        // The user may have switched scopes while this awaited — don't let a
        // stale reload for scope A overwrite scope B's already-current list.
        if (selectedScopeIdRef.current === scopeId) await loadIntegrations()
      }
    } catch (err) {
      console.error('Error toggling integration:', err)
      toast.error('Failed to update integration')
    } finally {
      setActionInProgress(null)
    }
  }, [selectedScopeId, getOrFetchRawIntegration, evictRawIntegration, toast, loadIntegrations])

  const handlePing = useCallback(async (item: IntegrationDashboardItem) => {
    if (!selectedScopeId) return
    setActionInProgress(item.integrationId)
    try {
      const result = await cachedApi.pingIntegration(selectedScopeId, item.integrationId)
      if ('error' in result) {
        toast.error('Ping failed to reach the webhook endpoint')
        return
      }
      if (result.success) {
        toast.success(`Ping succeeded${result.statusCode ? ` (HTTP ${result.statusCode})` : ''}`)
      } else {
        toast.error(`Ping failed${result.statusCode ? ` (HTTP ${result.statusCode})` : ''}${result.error ? `: ${result.error}` : ''}`)
      }
    } catch (err) {
      console.error('Error pinging integration:', err)
      toast.error('Ping failed')
    } finally {
      setActionInProgress(null)
    }
  }, [selectedScopeId, toast])

  const handleViewDeliveries = useCallback((item: IntegrationDashboardItem) => {
    if (!selectedScopeId) return
    navigate(`/integrations/${item.integrationId}/deliveries?scopeId=${encodeURIComponent(selectedScopeId)}`)
  }, [selectedScopeId, navigate])

  const handleMenuAction = useCallback((action: string, item: IntegrationDashboardItem) => {
    if (actionInProgress) return
    switch (action) {
      case 'edit':
        handleEditIntegration(item)
        break
      case 'toggle-enabled':
        handleToggleEnabled(item)
        break
      case 'ping':
        handlePing(item)
        break
      case 'view-deliveries':
        handleViewDeliveries(item)
        break
      case 'delete':
        setItemToDelete(item)
        break
      default:
        break
    }
  }, [actionInProgress, handleEditIntegration, handleToggleEnabled, handlePing, handleViewDeliveries])

  const handleFormSubmit = useCallback(async (data: IntegrationWriteBody) => {
    const scopeId = selectedScopeId
    if (!scopeId) return
    setActionInProgress(editingIntegration?.integrationId || 'new')
    try {
      const result = editingIntegration
        ? await cachedApi.updateIntegration(scopeId, editingIntegration.integrationId, data)
        : await cachedApi.createIntegration(scopeId, data)

      if ('error' in result) {
        toast.error(`Failed to ${editingIntegration ? 'update' : 'create'} integration`)
        return
      }

      toast.success(`Integration ${editingIntegration ? 'updated' : 'created'} successfully!`)
      if (editingIntegration) evictRawIntegration(editingIntegration.integrationId)
      setIsFormOpen(false)
      setEditingIntegration(null)
      // The user may have switched scopes while this awaited — don't let a
      // stale reload for scope A overwrite scope B's already-current list.
      if (selectedScopeIdRef.current === scopeId) await loadIntegrations()
    } catch (err) {
      console.error('Error saving integration:', err)
      toast.error(`Failed to ${editingIntegration ? 'update' : 'create'} integration`)
    } finally {
      setActionInProgress(null)
    }
  }, [selectedScopeId, editingIntegration, evictRawIntegration, toast, loadIntegrations])

  const handleDeleteIntegration = useCallback(async (item: IntegrationDashboardItem) => {
    const scopeId = selectedScopeId
    if (!scopeId) return
    setActionInProgress(item.integrationId)
    try {
      const result = await cachedApi.deleteIntegration(scopeId, item.integrationId)
      if ('error' in result) {
        toast.error('Failed to delete integration')
      } else {
        toast.success('Integration deleted successfully!')
        evictRawIntegration(item.integrationId)
        // The user may have switched scopes while this awaited — don't let a
        // stale reload for scope A overwrite scope B's already-current list.
        if (selectedScopeIdRef.current === scopeId) await loadIntegrations()
      }
    } catch (err) {
      console.error('Error deleting integration:', err)
      toast.error('Failed to delete integration')
    } finally {
      setItemToDelete(null)
      setActionInProgress(null)
    }
  }, [selectedScopeId, evictRawIntegration, toast, loadIntegrations])

  const formatDate = useCallback((timestamp?: number): string => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }, [])

  // ── Table columns ──
  const columns = useMemo<TableColumn<IntegrationDashboardItem>[]>(() => [
    {
      key: 'name',
      name: 'NAME',
      width: 200,
      sortable: true,
      render: (item) => <Text UNSAFE_style={{ fontWeight: 'bold' }}>{item.name}</Text>
    },
    {
      key: 'trigger',
      name: 'TRIGGER',
      width: 160,
      sortable: true,
      sortFn: (a, b) => `${a.triggerResource}.${a.triggerOperation}`.localeCompare(`${b.triggerResource}.${b.triggerOperation}`),
      render: (item) => (
        <div className={style({ display: 'flex', alignItems: 'start' })}>
          <Badge variant="neutral">{item.triggerResource}.{item.triggerOperation}</Badge>
        </div>
      )
    },
    {
      key: 'enabled',
      name: 'ENABLED',
      width: 120,
      sortable: true,
      sortFn: (a, b) => (b.enabled ? 1 : 0) - (a.enabled ? 1 : 0),
      render: (item) => <StatusBadge status={item.enabled ? 'active' : 'draft'} label={item.enabled ? 'Enabled' : 'Disabled'} />
    },
    {
      key: 'lastDeliveryStatus',
      name: 'LAST DELIVERY',
      width: 140,
      sortable: false,
      render: (item) => {
        const isLoadingStatus = loadingDeliveryStatus.has(item.integrationId)
        if (isLoadingStatus) return <div style={createShimmerStyle(80, 20)} />
        const status = deliveryStatuses.get(item.integrationId)
        if (!status) return <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>No deliveries</Text>
        return <StatusBadge status={status === 'success' ? 'confirmed' : status === 'failed' ? 'cancelled' : 'pending'} label={status} />
      }
    },
    {
      key: 'endpoint',
      name: 'ENDPOINT',
      width: 260,
      sortable: true,
      render: (item) => {
        if (item.endpoint === undefined && loadingIntegrationDetail.has(item.integrationId)) {
          return <div style={createShimmerStyle(180, 20)} />
        }
        return (
          <Text UNSAFE_style={{ fontSize: 13, color: 'var(--spectrum-global-color-gray-700)', wordBreak: 'break-all' }}>
            {item.endpoint || 'N/A'}
          </Text>
        )
      }
    },
    {
      key: 'conditionCount',
      name: 'CONDITIONS',
      width: 110,
      sortable: true,
      render: (item) => {
        if (item.conditionCount === undefined && loadingIntegrationDetail.has(item.integrationId)) {
          return <div style={createShimmerStyle(30, 20)} />
        }
        return <Text>{item.conditionCount ?? 0}</Text>
      }
    },
    {
      key: 'modificationTime',
      name: 'LAST MODIFIED',
      width: 150,
      sortable: true,
      render: (item) => {
        if (item.modificationTime === undefined && loadingIntegrationDetail.has(item.integrationId)) {
          return <div style={createShimmerStyle(90, 20)} />
        }
        return <Text>{formatDate(item.modificationTime)}</Text>
      }
    },
    {
      key: 'manage',
      name: 'MANAGE',
      width: 130,
      sortable: false,
      cellNoWrap: true,
      render: (item) => (
        <MenuTrigger>
          <ActionButton isQuiet aria-label="Actions menu">
            <More />
          </ActionButton>
          <Menu onAction={(key) => handleMenuAction(key as string, item)}>
            {buildIntegrationManageActions({ item, canWrite: canWriteIntegration, canDelete: canDeleteIntegration })}
          </Menu>
        </MenuTrigger>
      )
    }
  ], [formatDate, loadingDeliveryStatus, deliveryStatuses, loadingIntegrationDetail, handleMenuAction, canWriteIntegration, canDeleteIntegration])

  const createButton = useMemo(() => {
    if (!canWriteIntegration) return undefined
    return (
      <Button
        data-testid="create-integration-trigger"
        variant="accent"
        onPress={handleCreateIntegration}
        isDisabled={!selectedScopeId}
      >
        <Add />
        <Text>New Integration</Text>
      </Button>
    )
  }, [canWriteIntegration, handleCreateIntegration, selectedScopeId])

  const scopeSelectorHeader = useMemo(() => (
    <div
      style={{
        marginBottom: 16,
        padding: 20,
        background: 'var(--spectrum-global-color-gray-75)',
        borderRadius: 8,
        border: '1px solid var(--spectrum-global-color-gray-200)',
      }}
    >
      <div className={style({ display: 'flex', alignItems: 'end', gap: 8, flexWrap: 'wrap' })}>
        {isLoadingScopes ? (
          <Text UNSAFE_style={{ fontWeight: 600 }}>Loading scopes...</Text>
        ) : (
          <ComboBox
            data-testid="integration-scope-selector"
            label={`Select Scope (${filteredScopeItems.length} available)`}
            selectedKey={selectedScopeId}
            onSelectionChange={(key) => setSelectedScopeId(key as string | null)}
            onInputChange={setScopeFilterText}
            defaultItems={filteredScopeItems}
            styles={style({ width: 420 })}
            menuTrigger="input"
            menuWidth={420}
            allowsCustomValue={false}
          >
            {(item) => (
              <ComboBoxItem id={item.id} textValue={item.name}>
                <Text slot="label">{item.name}</Text>
                <Text slot="description">{item.type}</Text>
              </ComboBoxItem>
            )}
          </ComboBox>
        )}
        {selectedScope && (
          <div className={style({ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 })}>
            <Badge variant={SCOPE_TYPE_VARIANTS[selectedScope.type] || 'neutral'}>{selectedScope.type}</Badge>
            <Button
              size="S"
              variant="secondary"
              onPress={() => {
                setSelectedScopeId(null)
                setScopeFilterText('')
              }}
            >
              <RotateCCW />
              <Text>Reset scope</Text>
            </Button>
          </div>
        )}
      </div>
    </div>
  ), [isLoadingScopes, filteredScopeItems, selectedScopeId, selectedScope])

  return (
    <div data-testid="integrations-dashboard">
      <div style={{ paddingLeft: 32, paddingRight: 32, paddingTop: 32 }}>
        {scopeSelectorHeader}
      </div>

      {!selectedScopeId ? (
        <div style={{ minHeight: 480 }} aria-hidden />
      ) : (
        <div className={style({ padding: 32 })} style={{ paddingTop: 0 }}>
          <ResourceDashboardLayout
            title="Webhook Integrations"
            totalCount={integrations.length}
            error={error}
            data={integrations}
            columns={columns}
            getItemKey={(item) => item.integrationId}
            onVisibleItemsChange={handleVisibleItemsChange}
            onRefresh={loadIntegrations}
            createButton={createButton}
            emptyStateIllustration={<PluginIllustration aria-hidden />}
            emptyStateTitle="No Webhook Integrations"
            emptyStateDescription="Create a webhook integration to start receiving delivery notifications for this scope"
            dataTableTestIds={INTEGRATIONS_DASHBOARD_TABLE_TEST_IDS}
            searchPlaceholder="Search integrations..."
            searchKeys={INTEGRATIONS_SEARCH_KEYS}
          />
        </div>
      )}

      <IntegrationFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingIntegration(null)
        }}
        onSubmit={handleFormSubmit}
        integration={editingIntegration}
        isSubmitting={!!actionInProgress}
      />

      <DialogTrigger
        isOpen={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Webhook Integration"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={() => {
            if (itemToDelete) handleDeleteIntegration(itemToDelete)
          }}
          onCancel={() => setItemToDelete(null)}
          isPrimaryActionDisabled={!!actionInProgress}
        >
          Are you sure you want to delete <strong>{itemToDelete?.name}</strong>? This action cannot be undone
          and future deliveries for this webhook will stop immediately.
        </AlertDialog>
      </DialogTrigger>

      <BlurredLoadingOverlay
        visible={isLoading}
        message="Loading integrations..."
        ariaLabel="Loading integrations"
      />
      <BlurredLoadingOverlay
        visible={!!actionInProgress}
        message="Processing..."
        ariaLabel="Processing action"
        zIndex={9999}
      />
    </div>
  )
}
