/*
* <license header>
*/

/**
 * DeliveriesDashboard - Webhook delivery log (jobs view) for a single integration
 *
 * Route: `/integrations/:id/deliveries?scopeId=...` — `id` is the integrationId;
 * `scopeId` is carried as a query param since ESP scopes all integration
 * endpoints under `/v1/scopes/{scopeId}/...` and there is no cross-scope
 * lookup-by-id endpoint. Navigated to from IntegrationsDashboard's row menu,
 * which already knows the selected scope.
 */

import React, { useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ActionButton,
  Button,
  MenuTrigger,
  Menu,
  MenuItem,
  Text,
  Heading,
  DialogTrigger,
  AlertDialog,
  Badge,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import More from '@react-spectrum/s2/icons/More'
import Refresh from '@react-spectrum/s2/icons/Refresh'
import ChevronLeft from '@react-spectrum/s2/icons/ChevronLeft'
import DataIllustration from '@react-spectrum/s2/illustrations/linear/Data'
import { TableColumn } from '../../components/shared/DataTable'
import { StatusBadge, ResourceDashboardLayout, BlurredLoadingOverlay, ResourceEmptyState } from '../../components/shared'
import { cachedApi } from '../../services/api'
import { IMS } from '../../types'
import type { DeliveryRecord, IntegrationApiResponse } from '../../types/webhookApi'
import { useToast } from '../../contexts'
import { useSafeState } from '../../hooks'
import { useHasPermission } from '../../hooks/useHasPermission'
import { SURFACES, COLORS } from '../../styles/designSystem'

const DELIVERIES_DASHBOARD_TABLE_TEST_IDS = {
  root: 'deliveries-dashboard-table',
  emptyState: 'deliveries-dashboard-table-empty-state',
  pageInput: 'deliveries-dashboard-table-page-input',
  header: (columnKey: string) => `deliveries-dashboard-table-header-${columnKey}`,
  row: (itemKey: string) => `deliveries-dashboard-table-row-${itemKey}`,
}

const STATUS_TO_BADGE_STATUS: Record<DeliveryRecord['status'], string> = {
  success: 'confirmed',
  retrying: 'pending',
  failed: 'cancelled',
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** Pretty-prints a JSON-ish value in a monospace block. Deliberately not a
 *  literal `<pre>` tag (per project convention of composing typography with
 *  S2 primitives) — a styled `<div>` with `white-space: pre-wrap` achieves
 *  the same fixed-width, wrapping-friendly rendering. */
const JsonBlock: React.FC<{ label: string; value: unknown }> = ({ label, value }) => {
  const formatted = useMemo(() => {
    if (value === undefined || value === null) return null
    try {
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }, [value])

  return (
    <div>
      <Text UNSAFE_style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 4 }}>{label}</Text>
      {formatted ? (
        <div
          style={{
            backgroundColor: SURFACES.SUBTLE,
            border: `1px solid ${SURFACES.BORDER}`,
            borderRadius: 4,
            padding: '8px 12px',
            fontFamily: 'var(--emc-font-mono, ui-monospace, monospace)',
            fontSize: 12,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'break-word',
            maxHeight: 320,
            overflowY: 'auto',
            color: COLORS.GRAY_800,
          }}
        >
          {formatted}
        </div>
      ) : (
        <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_600, fontStyle: 'italic' }}>Not captured</Text>
      )}
    </div>
  )
}

interface DeliveriesDashboardProps {
  ims: IMS
}

export const DeliveriesDashboard: React.FC<DeliveriesDashboardProps> = () => {
  const { id: integrationId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const scopeId = searchParams.get('scopeId')
  const navigate = useNavigate()
  const toast = useToast()
  const canRedeliver = useHasPermission('integration', 'write')

  const [integration, setIntegration] = useSafeState<IntegrationApiResponse | null>(null)
  const [deliveries, setDeliveries] = useSafeState<DeliveryRecord[]>([])
  const [isLoading, setIsLoading] = useSafeState(true)
  const [error, setError] = useSafeState<string | null>(null)
  const [expandedKeys, setExpandedKeys] = useSafeState<Set<string>>(new Set())
  const [deliveryToRedeliver, setDeliveryToRedeliver] = useSafeState<DeliveryRecord | null>(null)
  const [actionInProgress, setActionInProgress] = useSafeState<string | null>(null)
  const [detailLoadingIds, setDetailLoadingIds] = useSafeState<Set<string>>(new Set())

  const loadDeliveries = useCallback(async () => {
    if (!scopeId || !integrationId) return
    setIsLoading(true)
    setError(null)
    try {
      const [integrationResult, deliveriesResult] = await Promise.all([
        cachedApi.getIntegrationById(scopeId, integrationId),
        cachedApi.getDeliveries(scopeId, integrationId),
      ])
      if (!('error' in integrationResult)) setIntegration(integrationResult)
      if ('error' in deliveriesResult) {
        throw new Error(typeof deliveriesResult.error === 'string' ? deliveriesResult.error : 'Failed to load deliveries')
      }
      setDeliveries([...deliveriesResult].sort((a, b) => b.timestamp - a.timestamp))
    } catch (err) {
      console.error('Error loading deliveries:', err)
      setError('Failed to load deliveries')
    } finally {
      setIsLoading(false)
    }
  }, [scopeId, integrationId])

  useEffect(() => {
    loadDeliveries()
  }, [loadDeliveries])

  const handleToggleExpand = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  // The list endpoint may return truncated request/response bodies (see
  // `DeliveryRecord.requestTruncated`/`responseTruncated`); the single-delivery
  // GET is documented to return the full bodies, so fetch it lazily the first
  // time a truncated row is expanded and merge the full record into local state.
  useEffect(() => {
    if (!scopeId || !integrationId) return
    const toFetch = deliveries.filter(
      (d) => expandedKeys.has(d.deliveryId) && (d.requestTruncated || d.responseTruncated) && !detailLoadingIds.has(d.deliveryId)
    )
    if (toFetch.length === 0) return

    setDetailLoadingIds((prev) => new Set([...prev, ...toFetch.map((d) => d.deliveryId)]))

    Promise.all(
      toFetch.map(async (d) => {
        try {
          const result = await cachedApi.getDeliveryById(scopeId, integrationId, d.deliveryId)
          return 'error' in result ? null : result
        } catch {
          return null
        }
      })
    ).then((results) => {
      setDeliveries((prev) => prev.map((d) => {
        const full = results.find((r) => r && r.deliveryId === d.deliveryId)
        return full ?? d
      }))
      setDetailLoadingIds((prev) => {
        const next = new Set(prev)
        toFetch.forEach((d) => next.delete(d.deliveryId))
        return next
      })
    })
  }, [expandedKeys, deliveries, scopeId, integrationId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMenuAction = useCallback((action: string, item: DeliveryRecord) => {
    if (action === 'redeliver') {
      setDeliveryToRedeliver(item)
    }
  }, [])

  const handleConfirmRedeliver = useCallback(async () => {
    if (!deliveryToRedeliver || !scopeId || !integrationId) return
    setActionInProgress(deliveryToRedeliver.deliveryId)
    try {
      const result = await cachedApi.redeliverDelivery(scopeId, integrationId, deliveryToRedeliver.deliveryId)
      if ('error' in result) {
        toast.error('Failed to redeliver')
      } else {
        toast.success('Redelivery triggered')
        await loadDeliveries()
      }
    } catch (err) {
      console.error('Error redelivering:', err)
      toast.error('Failed to redeliver')
    } finally {
      setDeliveryToRedeliver(null)
      setActionInProgress(null)
    }
  }, [deliveryToRedeliver, scopeId, integrationId, toast, loadDeliveries])

  const columns = useMemo<TableColumn<DeliveryRecord>[]>(() => [
    {
      key: 'timestamp',
      name: 'TIMESTAMP',
      width: 200,
      sortable: true,
      render: (item) => <Text>{formatTimestamp(item.timestamp)}</Text>
    },
    {
      key: 'status',
      name: 'STATUS',
      width: 120,
      sortable: true,
      render: (item) => <StatusBadge status={STATUS_TO_BADGE_STATUS[item.status]} label={item.status} />
    },
    {
      key: 'attemptCount',
      name: 'ATTEMPTS',
      width: 100,
      sortable: true,
      render: (item) => <Text>{item.attemptCount}</Text>
    },
    {
      key: 'responseStatusCode',
      name: 'RESPONSE CODE',
      width: 130,
      sortable: true,
      render: (item) => <Text>{item.responseStatusCode ?? 'N/A'}</Text>
    },
    {
      key: 'error',
      name: 'ERROR',
      width: 240,
      sortable: false,
      render: (item) => (
        <Text UNSAFE_style={{ fontSize: 13, color: item.error ? 'var(--spectrum-global-color-red-700)' : 'var(--spectrum-global-color-gray-600)' }}>
          {item.error || '—'}
        </Text>
      )
    },
    {
      key: 'manage',
      name: 'MANAGE',
      width: 100,
      sortable: false,
      cellNoWrap: true,
      render: (item) => {
        if (!canRedeliver) return null
        return (
          <MenuTrigger>
            <ActionButton isQuiet aria-label="Actions menu">
              <More />
            </ActionButton>
            <Menu onAction={(key) => handleMenuAction(key as string, item)}>
              <MenuItem id="redeliver" textValue="Redeliver">
                <Refresh />
                <Text slot="label">Redeliver</Text>
              </MenuItem>
            </Menu>
          </MenuTrigger>
        )
      }
    }
  ], [canRedeliver, handleMenuAction])

  const renderExpandedContent = useCallback((item: DeliveryRecord) => {
    const isFetchingFullDetail = detailLoadingIds.has(item.deliveryId)
    return (
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
        {(item.requestTruncated || item.responseTruncated) && (
          <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-orange-700)', fontStyle: 'italic' }}>
            {isFetchingFullDetail ? 'Loading full request/response bodies…' : 'Request/response bodies were truncated by the server.'}
          </Text>
        )}
        <div className={style({ display: 'flex', gap: 24 })} style={{ flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <JsonBlock label="Request body" value={item.requestBody} />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <JsonBlock label="Response body" value={item.responseBody} />
          </div>
        </div>
      </div>
    )
  }, [detailLoadingIds])

  const isRowExpandable = useCallback(
    (item: DeliveryRecord) =>
      item.requestBody !== undefined || item.responseBody !== undefined || !!item.requestTruncated || !!item.responseTruncated,
    []
  )

  if (!scopeId || !integrationId) {
    return (
      <div style={{ padding: 32 }}>
        <ResourceEmptyState
          illustration={<DataIllustration aria-hidden />}
          title="Missing scope"
          description="Open deliveries from the Webhook Integrations dashboard so the scope is known."
        />
        <div className={style({ display: 'flex', justifyContent: 'center', marginTop: 16 })}>
          <Button variant="secondary" onPress={() => navigate('/integrations')}>
            <ChevronLeft />
            <Text>Back to Integrations</Text>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="deliveries-dashboard">
      <div style={{ paddingLeft: 32, paddingRight: 32, paddingTop: 32 }}>
        <div className={style({ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 })}>
          <ActionButton isQuiet aria-label="Back to integrations" onPress={() => navigate('/integrations')}>
            <ChevronLeft />
          </ActionButton>
          <Heading level={2}>
            Deliveries{integration ? ` — ${integration.name}` : ''}
          </Heading>
          {integration && (
            <Badge variant="neutral">{integration.trigger.resource}.{integration.trigger.operation}</Badge>
          )}
        </div>
      </div>

      <div className={style({ padding: 32 })} style={{ paddingTop: 0 }}>
        <ResourceDashboardLayout
          title="Delivery Log"
          totalCount={deliveries.length}
          error={error}
          data={deliveries}
          columns={columns}
          getItemKey={(item) => item.deliveryId}
          onRefresh={loadDeliveries}
          renderExpandedContent={renderExpandedContent}
          expandedKeys={expandedKeys}
          onToggleExpand={handleToggleExpand}
          isRowExpandable={isRowExpandable}
          emptyStateIllustration={<DataIllustration aria-hidden />}
          emptyStateTitle="No Deliveries Yet"
          emptyStateDescription="This webhook hasn't fired yet — deliveries will appear here once triggered"
          dataTableTestIds={DELIVERIES_DASHBOARD_TABLE_TEST_IDS}
          searchPlaceholder="Search deliveries..."
          searchKeys={['status', 'error']}
        />
      </div>

      <DialogTrigger
        isOpen={!!deliveryToRedeliver}
        onOpenChange={(open) => !open && setDeliveryToRedeliver(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Redeliver Webhook"
          variant="confirmation"
          primaryActionLabel="Redeliver"
          cancelLabel="Cancel"
          onPrimaryAction={handleConfirmRedeliver}
          onCancel={() => setDeliveryToRedeliver(null)}
          isPrimaryActionDisabled={!!actionInProgress}
        >
          Redeliver this webhook payload now? This creates a new delivery attempt and does not affect the original record.
        </AlertDialog>
      </DialogTrigger>

      <BlurredLoadingOverlay visible={isLoading} message="Loading deliveries..." ariaLabel="Loading deliveries" />
      <BlurredLoadingOverlay visible={!!actionInProgress} message="Redelivering..." ariaLabel="Redelivering" zIndex={9999} />
    </div>
  )
}
