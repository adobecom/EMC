import React, { useCallback, useMemo, useEffect } from 'react'
import {
  Badge,
  Button,
  ComboBox,
  ComboBoxItem,
  Text,
  DialogTrigger,
  AlertDialog,
  ActionButton,
  MenuTrigger,
  Menu,
  MenuItem,
  ProgressCircle,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Add from '@react-spectrum/s2/icons/Add'
import Edit from '@react-spectrum/s2/icons/Edit'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import More from '@react-spectrum/s2/icons/More'
import RotateCCW from '@react-spectrum/s2/icons/RotateCCW'
import Refresh from '@react-spectrum/s2/icons/Refresh'
import GlobeIllustration from '@react-spectrum/s2/illustrations/linear/Globe'
import { useApi } from '../../contexts/ApiContext'
import { useToast } from '../../contexts'
import { useHasPermission } from '../../hooks/useHasPermission'
import { useSafeState } from '../../hooks'
import { ResourceDashboardLayout, BlurredLoadingOverlay, ResourceEmptyState } from '../../components/shared'
import type { TableColumn } from '../../components/shared/DataTable'
import type { RBACApiScope } from '../../types/rbacApi'
import type {
  Integration,
  IntegrationCreateBody,
  IntegrationPingResult,
  TriggerConfig,
} from '../../types/integrationApi'
import { COLORS, SPACING } from '../../styles/designSystem'
import { IntegrationFormDialog } from './IntegrationFormDialog'
import { DeliveryHistoryDialog } from './DeliveryHistoryDialog'

interface IntegrationsDashboardProps {
  ims?: unknown
}

const SCOPE_TYPE_VARIANTS: Record<string, 'positive' | 'informative' | 'neutral'> = {
  platform: 'positive',
  org: 'informative',
  team: 'neutral',
}

function formatTriggerSummary(triggers: TriggerConfig[]): string {
  if (!triggers || triggers.length === 0) return '—'
  return triggers.map(t => `${t.resource}: ${t.operations.join(', ')}`).join(' · ')
}

function formatDate(ms?: number): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const IntegrationsDashboard: React.FC<IntegrationsDashboardProps> = () => {
  const apiService = useApi()
  const toast = useToast()
  const canWrite = useHasPermission('integration', 'write')
  const canDelete = useHasPermission('integration', 'delete')

  // ============================================================================
  // SCOPE STATE
  // ============================================================================

  const [scopes, setScopes] = useSafeState<RBACApiScope[]>([])
  const [selectedScopeId, setSelectedScopeId] = useSafeState<string | null>(null)
  const [scopeFilterText, setScopeFilterText] = useSafeState('')
  const [isLoadingScopes, setIsLoadingScopes] = useSafeState(true)

  // ============================================================================
  // INTEGRATIONS STATE
  // ============================================================================

  const [integrations, setIntegrations] = useSafeState<Integration[]>([])
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useSafeState(false)
  const [error, setError] = useSafeState<string | null>(null)

  // ============================================================================
  // DIALOG STATE
  // ============================================================================

  const [isFormOpen, setIsFormOpen] = useSafeState(false)
  const [editingIntegration, setEditingIntegration] = useSafeState<Integration | null>(null)
  const [deletingIntegration, setDeletingIntegration] = useSafeState<Integration | null>(null)
  const [deliveriesIntegration, setDeliveriesIntegration] = useSafeState<Integration | null>(null)
  const [actionInProgress, setActionInProgress] = useSafeState<string | null>(null)

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const selectedScope = useMemo(
    () => scopes.find(s => s.scopeId === selectedScopeId) || null,
    [scopes, selectedScopeId]
  )

  const scopesForPicker = useMemo(
    () => scopes.filter(s => s.type === 'org' || s.type === 'team'),
    [scopes]
  )

  const filteredScopes = useMemo(() => {
    const items = scopesForPicker.map(s => ({ id: s.scopeId, name: s.name, type: s.type }))
    if (!scopeFilterText) return items
    const lower = scopeFilterText.toLowerCase()
    return items.filter(s => s.name.toLowerCase().includes(lower) || s.type.toLowerCase().includes(lower))
  }, [scopesForPicker, scopeFilterText])

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadScopes = useCallback(async () => {
    setIsLoadingScopes(true)
    try {
      const result = await apiService.getScopes()
      if (!('error' in result)) setScopes(result)
    } finally {
      setIsLoadingScopes(false)
    }
  }, [apiService, setScopes, setIsLoadingScopes])

  const loadIntegrations = useCallback(async () => {
    if (!selectedScopeId) {
      setIntegrations([])
      return
    }
    setIsLoadingIntegrations(true)
    setError(null)
    try {
      const result = await apiService.getIntegrations(selectedScopeId)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setIntegrations(result.integrations || [])
    } finally {
      setIsLoadingIntegrations(false)
    }
  }, [apiService, selectedScopeId, setIntegrations, setIsLoadingIntegrations, setError])

  useEffect(() => { loadScopes() }, [loadScopes])
  useEffect(() => { loadIntegrations() }, [loadIntegrations])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreate = useCallback(() => {
    setEditingIntegration(null)
    setIsFormOpen(true)
  }, [setEditingIntegration, setIsFormOpen])

  const handleEdit = useCallback((integration: Integration) => {
    setEditingIntegration(integration)
    setIsFormOpen(true)
  }, [setEditingIntegration, setIsFormOpen])

  const handleFormSubmit = useCallback(async (data: IntegrationCreateBody) => {
    if (!selectedScopeId) return
    const id = editingIntegration?.integrationId || 'new'
    setActionInProgress(id)
    try {
      let result
      if (editingIntegration) {
        result = await apiService.updateIntegration(selectedScopeId, editingIntegration.integrationId, data)
      } else {
        result = await apiService.createIntegration(selectedScopeId, data)
      }
      if ('error' in result) {
        toast.error(`Failed to ${editingIntegration ? 'update' : 'create'} integration: ${result.error}`)
        return
      }
      toast.success(`Integration ${editingIntegration ? 'updated' : 'created'} successfully`)
      setIsFormOpen(false)
      setEditingIntegration(null)
      await loadIntegrations()
    } finally {
      setActionInProgress(null)
    }
  }, [apiService, selectedScopeId, editingIntegration, loadIntegrations, toast, setActionInProgress, setIsFormOpen, setEditingIntegration])

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingIntegration || !selectedScopeId) return
    setActionInProgress(deletingIntegration.integrationId)
    try {
      const result = await apiService.deleteIntegration(selectedScopeId, deletingIntegration.integrationId)
      if (result && 'error' in result) {
        toast.error(`Failed to delete integration: ${result.error}`)
        return
      }
      toast.success('Integration deleted')
      setDeletingIntegration(null)
      await loadIntegrations()
    } finally {
      setActionInProgress(null)
    }
  }, [apiService, selectedScopeId, deletingIntegration, loadIntegrations, toast, setActionInProgress, setDeletingIntegration])

  const handlePing = useCallback(async (integration: Integration) => {
    if (!selectedScopeId) return
    setActionInProgress(`ping-${integration.integrationId}`)
    try {
      const result = await apiService.pingIntegration(selectedScopeId, integration.integrationId)
      if ('error' in result) {
        toast.error(`Ping failed: ${result.error}`)
        return
      }
      const ping = result as IntegrationPingResult
      if (ping.status === 'ok') {
        toast.success(`Ping succeeded — endpoint is reachable`)
      } else {
        toast.error(`Ping failed${ping.error ? `: ${ping.error}` : ''}`)
      }
    } finally {
      setActionInProgress(null)
    }
  }, [apiService, selectedScopeId, toast, setActionInProgress])

  const handleMenuAction = useCallback((action: string, item: Integration) => {
    switch (action) {
      case 'edit': handleEdit(item); break
      case 'delete': setDeletingIntegration(item); break
      case 'deliveries': setDeliveriesIntegration(item); break
      case 'ping': handlePing(item); break
    }
  }, [handleEdit, handlePing, setDeletingIntegration, setDeliveriesIntegration])

  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================

  const columns = useMemo<TableColumn<Integration>[]>(() => [
    {
      key: 'name',
      name: 'NAME',
      width: 220,
      sortable: true,
      render: (item) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Text UNSAFE_style={{ fontWeight: 600 }}>{item.name}</Text>
          {item.description && (
            <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_600 }}>
              {item.description.length > 50 ? item.description.slice(0, 50) + '…' : item.description}
            </Text>
          )}
        </div>
      ),
    },
    {
      key: 'endpoint',
      name: 'ENDPOINT',
      width: 240,
      sortable: false,
      render: (item) => (
        <Text UNSAFE_style={{ fontSize: 12, fontFamily: 'monospace', color: COLORS.GRAY_700 }}>
          {item.connection.endpoint.length > 45
            ? item.connection.endpoint.slice(0, 45) + '…'
            : item.connection.endpoint}
        </Text>
      ),
    },
    {
      key: 'triggers',
      name: 'TRIGGERS',
      width: 220,
      sortable: false,
      render: (item) => (
        <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_700 }}>
          {formatTriggerSummary(item.triggers)}
        </Text>
      ),
    },
    {
      key: 'enabled',
      name: 'STATUS',
      width: 100,
      sortable: true,
      sortFn: (a, b) => Number(b.enabled) - Number(a.enabled),
      render: (item) => (
        <Badge variant={item.enabled ? 'positive' : 'neutral'}>
          {item.enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'creationTime',
      name: 'CREATED',
      width: 140,
      sortable: true,
      sortFn: (a, b) => (a.creationTime ?? 0) - (b.creationTime ?? 0),
      render: (item) => (
        <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_600 }}>
          {formatDate(item.creationTime)}
        </Text>
      ),
    },
    {
      key: 'actions',
      name: 'ACTIONS',
      width: 80,
      sortable: false,
      render: (item) => {
        const isPinging = actionInProgress === `ping-${item.integrationId}`
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.XS }}>
            {isPinging && <ProgressCircle size="S" isIndeterminate aria-label="Pinging…" />}
            <MenuTrigger>
              <ActionButton isQuiet aria-label="Actions menu" isDisabled={!!actionInProgress}>
                <More />
              </ActionButton>
              <Menu onAction={(key) => handleMenuAction(key as string, item)}>
                {canWrite && (
                  <MenuItem id="edit" textValue="Edit">
                    <Edit />
                    <Text slot="label">Edit</Text>
                  </MenuItem>
                )}
                <MenuItem id="deliveries" textValue="View Deliveries">
                  <Refresh />
                  <Text slot="label">View Deliveries</Text>
                </MenuItem>
                {canWrite && (
                  <MenuItem id="ping" textValue="Ping">
                    <RotateCCW />
                    <Text slot="label">Ping</Text>
                  </MenuItem>
                )}
                {canDelete && (
                  <MenuItem id="delete" textValue="Delete">
                    <RemoveCircle />
                    <Text slot="label">Delete</Text>
                  </MenuItem>
                )}
              </Menu>
            </MenuTrigger>
          </div>
        )
      },
    },
  ], [canWrite, canDelete, actionInProgress, handleMenuAction])

  // ============================================================================
  // RENDER
  // ============================================================================

  const createButton = useMemo(() => {
    if (!canWrite || !selectedScopeId) return undefined
    return (
      <Button variant="accent" onPress={handleCreate}>
        <Add />
        <Text>New Integration</Text>
      </Button>
    )
  }, [canWrite, selectedScopeId, handleCreate])

  return (
    <div data-testid="integrations-dashboard">
      {/* Scope Selector */}
      <div style={{ padding: `${SPACING.LG}px ${SPACING.XL}px 0` }}>
        <div
          style={{
            marginBottom: SPACING.MD,
            padding: SPACING.LG,
            background: 'var(--spectrum-global-color-gray-75)',
            borderRadius: 8,
            border: `1px solid var(--spectrum-global-color-gray-200)`,
          }}
        >
          <div className={style({ display: 'flex', alignItems: 'end', gap: 8, flexWrap: 'wrap' })}>
            {isLoadingScopes ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Text UNSAFE_style={{ fontWeight: 600 }}>Loading scopes…</Text>
                <ProgressCircle size="S" isIndeterminate aria-label="Loading scopes" />
              </div>
            ) : (
              <ComboBox
                label={`Select Scope (${filteredScopes.length} available)`}
                selectedKey={selectedScopeId}
                onSelectionChange={(key) => setSelectedScopeId(key as string | null)}
                onInputChange={setScopeFilterText}
                items={filteredScopes}
                styles={style({ width: 480 })}
                menuTrigger="input"
                menuWidth={480}
                allowsCustomValue={false}
                isDisabled={scopesForPicker.length === 0}
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
                <Badge variant={SCOPE_TYPE_VARIANTS[selectedScope.type] || 'neutral'}>
                  {selectedScope.type}
                </Badge>
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
      </div>

      {/* Content */}
      {isLoadingScopes ? (
        <div style={{ minHeight: 480 }} aria-hidden />
      ) : !selectedScopeId ? (
        <div style={{ padding: SPACING.XL }}>
          <ResourceEmptyState
            illustration={<GlobeIllustration aria-hidden />}
            title="Select a scope"
            description="Choose an org or team scope above to view and manage its webhook integrations."
          />
        </div>
      ) : (
        <div className={style({ padding: 32 })}>
          <ResourceDashboardLayout
            title="Integrations"
            totalCount={integrations.length}
            error={error}
            data={integrations}
            columns={columns}
            getItemKey={(item) => item.integrationId}
            onRefresh={loadIntegrations}
            createButton={createButton}
            emptyStateIllustration={<GlobeIllustration aria-hidden />}
            emptyStateTitle="No Integrations"
            emptyStateDescription="Create your first webhook integration to start receiving ESP resource events."
            searchPlaceholder="Search integrations…"
            searchKeys={['name', 'description']}
          />
        </div>
      )}

      {/* Create / Edit Dialog */}
      <IntegrationFormDialog
        isOpen={isFormOpen}
        integration={editingIntegration}
        onClose={() => {
          setIsFormOpen(false)
          setEditingIntegration(null)
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={!!actionInProgress && actionInProgress !== 'new' && !actionInProgress.startsWith('ping-')}
      />

      {/* Delete Confirmation */}
      <DialogTrigger
        isOpen={!!deletingIntegration}
        onOpenChange={(open) => !open && setDeletingIntegration(null)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete Integration"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={handleConfirmDelete}
          onCancel={() => setDeletingIntegration(null)}
          isPrimaryActionDisabled={!!actionInProgress}
        >
          Delete <strong>{deletingIntegration?.name}</strong>? This will stop all future deliveries for this integration.
          This action cannot be undone.
        </AlertDialog>
      </DialogTrigger>

      {/* Delivery History Dialog */}
      <DeliveryHistoryDialog
        integration={deliveriesIntegration}
        scopeId={selectedScopeId || ''}
        isOpen={!!deliveriesIntegration}
        onClose={() => setDeliveriesIntegration(null)}
      />

      <BlurredLoadingOverlay
        visible={isLoadingIntegrations}
        message="Loading integrations…"
        ariaLabel="Loading integrations"
      />
      <BlurredLoadingOverlay
        visible={!!actionInProgress && !actionInProgress.startsWith('ping-')}
        message="Processing…"
        ariaLabel="Processing"
        zIndex={9999}
      />
    </div>
  )
}
