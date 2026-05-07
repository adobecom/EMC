import React, { useState, useCallback, useEffect } from 'react'
import { useSafeState } from '../../hooks'
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogTrigger,
  Content,
  Heading,
  Text,
  Badge,
  Divider,
  Picker,
  PickerItem,
  ActionButton,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import RefreshIcon from '@react-spectrum/s2/icons/Refresh'
import RotateCCW from '@react-spectrum/s2/icons/RotateCCW'
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown'
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight'
import { useApi } from '../../contexts/ApiContext'
import { useToast } from '../../contexts'
import { useHasPermission } from '../../hooks/useHasPermission'
import { SPACING, COLORS } from '../../styles/designSystem'
import type { Integration, Delivery, DeliveryStatus } from '../../types/integrationApi'

interface DeliveryHistoryDialogProps {
  integration: Integration | null
  scopeId: string
  isOpen: boolean
  onClose: () => void
}

const STATUS_VARIANT: Record<DeliveryStatus, 'positive' | 'negative' | 'notice' | 'neutral'> = {
  success: 'positive',
  failed: 'negative',
  retrying: 'notice',
  pending: 'neutral',
}

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  success: 'Success',
  failed: 'Failed',
  retrying: 'Retrying',
  pending: 'Pending',
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

interface DeliveryRowProps {
  delivery: Delivery
  scopeId: string
  integrationId: string
  canWrite: boolean
  onRedeliver: (deliveryId: string) => void
  redelivering: boolean
}

const DeliveryRow: React.FC<DeliveryRowProps> = ({
  delivery, canWrite, onRedeliver, redelivering
}) => {
  const [expanded, setExpanded] = useState(false)
  const canRedeliver = canWrite && (delivery.status === 'failed' || delivery.status === 'retrying')

  return (
    <div style={{ borderBottom: `1px solid ${COLORS.GRAY_200}` }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 160px 180px 100px 100px 1fr',
          gap: SPACING.SM,
          padding: `${SPACING.SM}px ${SPACING.MD}px`,
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((v: boolean) => !v)}
      >
        <div>
          <Badge variant={STATUS_VARIANT[delivery.status]}>
            {STATUS_LABEL[delivery.status]}
          </Badge>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Text UNSAFE_style={{ fontSize: 13, fontWeight: 500 }}>
            {delivery.triggerContext?.resource || '—'}
          </Text>
          <Text UNSAFE_style={{ fontSize: 11, color: COLORS.GRAY_600 }}>
            {delivery.triggerContext?.operation || '—'}
          </Text>
        </div>
        <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_700 }}>
          {delivery.triggeredAt ? formatTimestamp(delivery.triggeredAt) : '—'}
        </Text>
        <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_700 }}>
          {delivery.attempt ?? 0} / {delivery.maxAttempts ?? 3}
        </Text>
        <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_700 }}>
          {delivery.deliveredAt ? formatTimestamp(delivery.deliveredAt) : '—'}
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM, justifyContent: 'flex-end' }}>
          {canRedeliver && (
            <ActionButton
              isQuiet
              size="S"
              isDisabled={redelivering}
              onPress={(e) => {
                e.continuePropagation?.()
                onRedeliver(delivery.deliveryId)
              }}
            >
              <RotateCCW />
              <Text>Redeliver</Text>
            </ActionButton>
          )}
          {expanded ? <ChevronDown /> : <ChevronRight />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: `${SPACING.SM}px ${SPACING.MD}px ${SPACING.MD}px`, background: COLORS.GRAY_100 }}>
          {delivery.request && (
            <div style={{ marginBottom: SPACING.SM }}>
              <Text UNSAFE_style={{ fontSize: 11, fontWeight: 600, color: COLORS.GRAY_600, textTransform: 'uppercase', letterSpacing: 1 }}>
                Request
              </Text>
              <div style={{ marginTop: SPACING.XS, fontFamily: 'monospace', fontSize: 12, background: COLORS.GRAY_200, padding: SPACING.SM, borderRadius: 4, overflowX: 'auto' }}>
                <div>{delivery.request.method} {delivery.request.url}</div>
                {delivery.request.body && (
                  <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {delivery.request.body.length > 2000
                      ? delivery.request.body.slice(0, 2000) + '\n…(truncated)'
                      : delivery.request.body}
                  </pre>
                )}
                {delivery.request.bodySize !== undefined && !delivery.request.body && (
                  <div style={{ marginTop: 4, color: COLORS.GRAY_600 }}>
                    Body: {delivery.request.bodySize} bytes (stored externally)
                  </div>
                )}
              </div>
            </div>
          )}
          {delivery.response && (
            <div style={{ marginBottom: SPACING.SM }}>
              <Text UNSAFE_style={{ fontSize: 11, fontWeight: 600, color: COLORS.GRAY_600, textTransform: 'uppercase', letterSpacing: 1 }}>
                Response
              </Text>
              <div style={{ marginTop: SPACING.XS, fontFamily: 'monospace', fontSize: 12, background: COLORS.GRAY_200, padding: SPACING.SM, borderRadius: 4 }}>
                HTTP {delivery.response.status}
              </div>
            </div>
          )}
          {delivery.error && (
            <div>
              <Text UNSAFE_style={{ fontSize: 11, fontWeight: 600, color: COLORS.GRAY_600, textTransform: 'uppercase', letterSpacing: 1 }}>
                Error
              </Text>
              <div style={{ marginTop: SPACING.XS, fontFamily: 'monospace', fontSize: 12, background: '#fff0f0', padding: SPACING.SM, borderRadius: 4, color: COLORS.RED_600 }}>
                {delivery.error.message}
              </div>
            </div>
          )}
          {!delivery.request && !delivery.response && !delivery.error && (
            <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_600 }}>No details available.</Text>
          )}
        </div>
      )}
    </div>
  )
}

export const DeliveryHistoryDialog: React.FC<DeliveryHistoryDialogProps> = ({
  integration, scopeId, isOpen, onClose
}) => {
  const apiService = useApi()
  const toast = useToast()
  const canWrite = useHasPermission('integration', 'write')

  const [deliveries, setDeliveries] = useSafeState<Delivery[]>([])
  const [isLoading, setIsLoading] = useSafeState(false)
  const [nextPageToken, setNextPageToken] = useSafeState<string | null>(null)
  const [statusFilter, setStatusFilter] = useSafeState<string>('')
  const [redelivering, setRedelivering] = useSafeState<string | null>(null)

  const loadDeliveries = useCallback(async (pageToken?: string) => {
    if (!integration) return
    setIsLoading(true)
    try {
      const result = await apiService.getDeliveries(scopeId, integration.integrationId, {
        pageSize: 25,
        pageToken,
        status: statusFilter || undefined,
      })
      if ('error' in result) {
        toast.error(`Failed to load deliveries: ${result.error}`)
        return
      }
      if (pageToken) {
        setDeliveries(prev => [...prev, ...(result.deliveries || [])])
      } else {
        setDeliveries(result.deliveries || [])
      }
      setNextPageToken(result.nextPageToken)
    } finally {
      setIsLoading(false)
    }
  }, [apiService, integration, scopeId, statusFilter, toast])

  useEffect(() => {
    if (isOpen && integration) {
      setDeliveries([])
      setNextPageToken(null)
      loadDeliveries()
    }
  }, [isOpen, integration, loadDeliveries])

  const handleRedeliver = useCallback(async (deliveryId: string) => {
    if (!integration) return
    setRedelivering(deliveryId)
    try {
      const result = await apiService.redeliverDelivery(scopeId, integration.integrationId, deliveryId)
      if ('error' in result) {
        toast.error(`Redeliver failed: ${result.error}`)
        return
      }
      toast.success('Delivery queued for retry')
      loadDeliveries()
    } finally {
      setRedelivering(null)
    }
  }, [apiService, integration, scopeId, toast, loadDeliveries])

  const handleFilterChange = useCallback((key: string) => {
    setStatusFilter(key === 'all' ? '' : key)
  }, [])

  if (!integration) return null

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <div style={{ display: 'none' }} />
      <Dialog size="L">
        <Content>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.MD }}>
            <div>
              <Heading level={2}>{integration.name} — Delivery History</Heading>
              <Text UNSAFE_style={{ fontSize: 13, color: COLORS.GRAY_600 }}>
                {integration.connection.endpoint}
              </Text>
            </div>
            <ActionButton isQuiet onPress={() => loadDeliveries()} isDisabled={isLoading} aria-label="Refresh deliveries">
              <RefreshIcon />
            </ActionButton>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM, marginBottom: SPACING.MD }}>
            <Text UNSAFE_style={{ fontSize: 13 }}>Filter by status:</Text>
            <Picker
              label=""
              aria-label="Filter by status"
              selectedKey={statusFilter || 'all'}
              onSelectionChange={key => handleFilterChange(key as string)}
              styles={style({ width: 160 })}
            >
              <PickerItem id="all">All statuses</PickerItem>
              <PickerItem id="success">Success</PickerItem>
              <PickerItem id="failed">Failed</PickerItem>
              <PickerItem id="retrying">Retrying</PickerItem>
              <PickerItem id="pending">Pending</PickerItem>
            </Picker>
          </div>

          <Divider />

          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '120px 160px 180px 100px 100px 1fr',
            gap: SPACING.SM,
            padding: `${SPACING.SM}px ${SPACING.MD}px`,
            background: COLORS.GRAY_100,
            borderBottom: `1px solid ${COLORS.GRAY_300}`,
          }}>
            {['STATUS', 'RESOURCE', 'TRIGGERED AT', 'ATTEMPTS', 'DELIVERED AT', ''].map(h => (
              <Text key={h} UNSAFE_style={{ fontSize: 11, fontWeight: 600, color: COLORS.GRAY_600, textTransform: 'uppercase', letterSpacing: 1 }}>
                {h}
              </Text>
            ))}
          </div>

          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            {isLoading && deliveries.length === 0 && (
              <div style={{ padding: SPACING.LG, textAlign: 'center' }}>
                <Text UNSAFE_style={{ color: COLORS.GRAY_600 }}>Loading deliveries…</Text>
              </div>
            )}
            {!isLoading && deliveries.length === 0 && (
              <div style={{ padding: SPACING.LG, textAlign: 'center' }}>
                <Text UNSAFE_style={{ color: COLORS.GRAY_600 }}>No deliveries found{statusFilter ? ' for this filter' : ''}.</Text>
              </div>
            )}
            {deliveries.map(delivery => (
              <DeliveryRow
                key={delivery.deliveryId}
                delivery={delivery}
                scopeId={scopeId}
                integrationId={integration.integrationId}
                canWrite={canWrite}
                onRedeliver={handleRedeliver}
                redelivering={redelivering === delivery.deliveryId}
              />
            ))}
            {nextPageToken && (
              <div style={{ padding: SPACING.MD, textAlign: 'center' }}>
                <Button
                  variant="secondary"
                  onPress={() => loadDeliveries(nextPageToken)}
                  isDisabled={isLoading}
                >
                  Load more
                </Button>
              </div>
            )}
          </div>

          <Divider />
          <ButtonGroup>
            <Button variant="secondary" onPress={onClose}>Close</Button>
          </ButtonGroup>
        </Content>
      </Dialog>
    </DialogTrigger>
  )
}
