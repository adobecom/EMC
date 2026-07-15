/*
* <license header>
*/

/**
 * IntegrationFormDialog - Modal dialog for creating/editing webhook integrations
 *
 * Single `Dialog size="L"` sectioned by `Tabs` (Trigger / Conditions / Payload /
 * Connection / Retry), following the SpeakerFormDialog shape (one `onSubmit`
 * callback, dashboard owns open/edit state) rather than the EventForm
 * `FormWizard` — this is a flat single-resource form, not a multi-step publish
 * flow.
 *
 * Secrets are write-only (`ConnectionConfig.secrets` only ever reports
 * `{ isSet: boolean }`, never the value). To avoid accidentally clobbering an
 * already-configured secret, existing secret rows render collapsed as
 * "Set — Replace" and only become editable (and therefore included in the
 * submitted payload) once the admin explicitly clicks "Replace". New secret
 * rows are always editable.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  ActionButton,
  Text,
  Button,
  ButtonGroup,
  TextField,
  NumberField,
  Dialog,
  DialogTrigger,
  Content,
  Heading,
  Form,
  ProgressCircle,
  Picker,
  PickerItem,
  Switch,
  Checkbox,
  Tabs,
  TabList,
  Tab,
  TabPanel,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Add from '@react-spectrum/s2/icons/Add'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import Edit from '@react-spectrum/s2/icons/Edit'
import { TYPOGRAPHY } from '../../styles/designSystem'
import type {
  IntegrationApiResponse,
  IntegrationTriggerResource,
  IntegrationTriggerOperation,
  ConditionRule,
  ConditionOperator,
  ConnectionType,
  IntegrationWriteBody,
} from '../../types/webhookApi'

// Only resources ESP's integrations Lambda actually resolves a scope for and fires
// triggers on today. `attendee` (account-level) is a valid API value but has no
// scope-resolution path server-side -- an integration configured against it would
// silently never fire. See docs/integrations/migration-plan.md (events-service-platform
// repo) for the full breakdown; re-add here once that's implemented.
const TRIGGER_RESOURCES: { key: IntegrationTriggerResource; label: string }[] = [
  { key: 'event', label: 'Event' },
  { key: 'series', label: 'Series' },
  { key: 'session', label: 'Session' },
  { key: 'sessionTime', label: 'Session Time' },
  { key: 'speaker', label: 'Speaker' },
  { key: 'sponsor', label: 'Sponsor' },
]

// `delete` isn't outbox-wired for any resource yet -- an integration configured
// against it would silently never fire. Re-add once that lands.
const TRIGGER_OPERATIONS: { key: IntegrationTriggerOperation; label: string }[] = [
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Update' },
]

const CONDITION_OPERATORS: { key: ConditionOperator; label: string }[] = [
  { key: 'eq', label: 'Equals (=)' },
  { key: 'ne', label: 'Not equals (≠)' },
  { key: 'gt', label: 'Greater than (>)' },
  { key: 'lt', label: 'Less than (<)' },
  { key: 'ge', label: 'Greater or equal (≥)' },
  { key: 'le', label: 'Less or equal (≤)' },
]

const PAYLOAD_OBJECTS = ['series', 'event', 'session', 'sessionTime', 'speaker', 'sponsor'] as const

// 'marketo' isn't offered yet -- see the ConnectionType comment in types/webhookApi.ts.
const CONNECTION_TYPES: { key: ConnectionType; label: string }[] = [
  { key: 'generic', label: 'Generic (custom endpoint)' },
]

interface SecretRow {
  key: string
  value: string
  /** True for a secret that already has a stored value on the server. */
  isSet: boolean
  /** True once the admin has opted to replace an already-set secret, or for any new row. */
  isEditable: boolean
}

interface FieldMappingRow {
  source: string
  target: string
}

interface FormState {
  name: string
  enabled: boolean
  triggerResource: string
  triggerOperation: IntegrationTriggerOperation
  conditions: ConditionRule[]
  endpoint: string
  payloadObjects: string[]
  /** Field renaming per object, keyed by object name — only objects with at least one mapping row are included on submit. */
  transforms: Record<string, FieldMappingRow[]>
  connectionType: ConnectionType
  secrets: SecretRow[]
  hmacEnabled: boolean
  hmacHeaderName: string
  maxAttempts: number
  backoffSeconds: number[]
}

function emptyFormState(): FormState {
  return {
    name: '',
    enabled: true,
    triggerResource: 'event',
    triggerOperation: 'update',
    conditions: [],
    endpoint: '',
    payloadObjects: ['event'],
    transforms: {},
    connectionType: 'generic',
    secrets: [],
    hmacEnabled: false,
    hmacHeaderName: '',
    maxAttempts: 3,
    backoffSeconds: [30, 120, 600],
  }
}

// Known gap: if an existing record's triggerResource/triggerOperation/connectionType/
// payloadObjects holds a value hidden from the pickers above (e.g. a legacy 'attendee'
// trigger, from before that option was removed), the corresponding Picker/checkbox will
// render with no visible selection here -- the value is preserved correctly on save
// (nothing below rewrites it), it's just not shown. Not fixed now since essentially no
// such record can exist yet (those options were only ever briefly selectable); revisit
// with a disabled/read-only fallback label if that changes.
function formStateFromIntegration(integration: IntegrationApiResponse): FormState {
  const transforms: Record<string, FieldMappingRow[]> = {}
  const rawTransforms = integration.action?.data?.transforms || {}
  for (const [object, transform] of Object.entries(rawTransforms)) {
    transforms[object] = Object.entries(transform.mapping || {}).map(([source, target]) => ({ source, target }))
  }

  const secrets: SecretRow[] = Object.keys(integration.connection?.secrets || {}).map((key) => ({
    key,
    value: '',
    isSet: !!integration.connection.secrets[key]?.isSet,
    isEditable: false,
  }))

  return {
    name: integration.name || '',
    enabled: integration.enabled,
    triggerResource: integration.trigger?.resource || 'event',
    triggerOperation: integration.trigger?.operation || 'update',
    conditions: integration.conditions ? integration.conditions.map((c) => ({ ...c })) : [],
    endpoint: integration.action?.endpoint || '',
    payloadObjects: integration.action?.data?.objects ? [...integration.action.data.objects] : [],
    transforms,
    connectionType: integration.connection?.type || 'generic',
    secrets,
    hmacEnabled: !!integration.connection?.hmac?.enabled,
    hmacHeaderName: integration.connection?.hmac?.headerName || '',
    maxAttempts: integration.retryPolicy?.maxAttempts ?? 3,
    backoffSeconds: integration.retryPolicy?.backoffSeconds?.length ? [...integration.retryPolicy.backoffSeconds] : [30],
  }
}

export interface IntegrationFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: IntegrationWriteBody) => Promise<void>
  integration: IntegrationApiResponse | null
  isSubmitting: boolean
}

export const IntegrationFormDialog: React.FC<IntegrationFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  integration,
  isSubmitting,
}) => {
  const [activeTab, setActiveTab] = useState<string>('trigger')
  const [form, setForm] = useState<FormState>(emptyFormState)

  const isEditing = !!integration

  useEffect(() => {
    if (isOpen) {
      setForm(integration ? formStateFromIntegration(integration) : emptyFormState())
      setActiveTab('trigger')
    }
  }, [isOpen, integration])

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  // ── Conditions ──
  const addCondition = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      conditions: [...prev.conditions, { propertyPath: '', operator: 'eq', value: '' }],
    }))
  }, [])

  const updateCondition = useCallback((index: number, updates: Partial<ConditionRule>) => {
    setForm((prev) => {
      const conditions = [...prev.conditions]
      conditions[index] = { ...conditions[index], ...updates }
      return { ...prev, conditions }
    })
  }, [])

  const removeCondition = useCallback((index: number) => {
    setForm((prev) => ({ ...prev, conditions: prev.conditions.filter((_, i) => i !== index) }))
  }, [])

  // ── Payload objects + field mapping ──
  const togglePayloadObject = useCallback((object: string, selected: boolean) => {
    setForm((prev) => ({
      ...prev,
      payloadObjects: selected
        ? [...prev.payloadObjects, object]
        : prev.payloadObjects.filter((o) => o !== object),
    }))
  }, [])

  const addMappingRow = useCallback((object: string) => {
    setForm((prev) => ({
      ...prev,
      transforms: {
        ...prev.transforms,
        [object]: [...(prev.transforms[object] || []), { source: '', target: '' }],
      },
    }))
  }, [])

  const updateMappingRow = useCallback((object: string, index: number, updates: Partial<FieldMappingRow>) => {
    setForm((prev) => {
      const rows = [...(prev.transforms[object] || [])]
      rows[index] = { ...rows[index], ...updates }
      return { ...prev, transforms: { ...prev.transforms, [object]: rows } }
    })
  }, [])

  const removeMappingRow = useCallback((object: string, index: number) => {
    setForm((prev) => {
      const rows = (prev.transforms[object] || []).filter((_, i) => i !== index)
      return { ...prev, transforms: { ...prev.transforms, [object]: rows } }
    })
  }, [])

  // ── Connection secrets ──
  const addSecretRow = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      secrets: [...prev.secrets, { key: '', value: '', isSet: false, isEditable: true }],
    }))
  }, [])

  const updateSecretRow = useCallback((index: number, updates: Partial<SecretRow>) => {
    setForm((prev) => {
      const secrets = [...prev.secrets]
      secrets[index] = { ...secrets[index], ...updates }
      return { ...prev, secrets }
    })
  }, [])

  const removeSecretRow = useCallback((index: number) => {
    setForm((prev) => ({ ...prev, secrets: prev.secrets.filter((_, i) => i !== index) }))
  }, [])

  // ── Retry / backoff ──
  // Backend bounds (openapi.json IntegrationRetryPolicy): backoffSeconds is
  // 1-10 items, each an integer 1-86400 seconds.
  const MAX_BACKOFF_STEPS = 10
  const MAX_BACKOFF_SECONDS = 86400

  const addBackoffStep = useCallback(() => {
    setForm((prev) => {
      if (prev.backoffSeconds.length >= MAX_BACKOFF_STEPS) return prev
      const next = Math.min((prev.backoffSeconds[prev.backoffSeconds.length - 1] ?? 30) * 2, MAX_BACKOFF_SECONDS)
      return { ...prev, backoffSeconds: [...prev.backoffSeconds, next] }
    })
  }, [])

  const updateBackoffStep = useCallback((index: number, value: number) => {
    setForm((prev) => {
      const backoffSeconds = [...prev.backoffSeconds]
      backoffSeconds[index] = value
      return { ...prev, backoffSeconds }
    })
  }, [])

  const removeBackoffStep = useCallback((index: number) => {
    setForm((prev) => ({ ...prev, backoffSeconds: prev.backoffSeconds.filter((_, i) => i !== index) }))
  }, [])

  const isFormValid = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.endpoint.trim().length > 0 &&
      form.payloadObjects.length > 0 &&
      form.maxAttempts >= 1 &&
      form.maxAttempts <= 10 &&
      form.backoffSeconds.length > 0 &&
      form.backoffSeconds.length <= MAX_BACKOFF_STEPS &&
      form.backoffSeconds.every((s) => s >= 1 && s <= MAX_BACKOFF_SECONDS) &&
      (!form.hmacEnabled || form.hmacHeaderName.trim().length > 0)
    )
  }, [form])

  const handleSubmit = useCallback(async () => {
    if (!isFormValid) return

    const transforms: IntegrationWriteBody['action']['data']['transforms'] = {}
    for (const [object, rows] of Object.entries(form.transforms)) {
      const mapping: Record<string, string> = {}
      rows.forEach((row) => {
        if (row.source.trim() && row.target.trim()) {
          mapping[row.source.trim()] = row.target.trim()
        }
      })
      if (Object.keys(mapping).length > 0 && form.payloadObjects.includes(object)) {
        transforms[object] = { mapping }
      }
    }

    // Only include secrets that are new or explicitly marked for replacement —
    // untouched already-set secrets are omitted so the server preserves them.
    const secrets: Record<string, string> = {}
    form.secrets.forEach((row) => {
      if (row.key.trim() && row.isEditable && row.value.trim()) {
        secrets[row.key.trim()] = row.value
      }
    })

    // A key that was already-set on load but no longer appears in the current rows was
    // removed via the "Remove secret" button. The backend treats an omitted key as
    // "leave alone" (merge-patch), so a removed secret must be sent as an explicit
    // empty-string tombstone or it would silently remain set server-side.
    const originalSecretKeys = Object.keys(integration?.connection?.secrets || {})
    const currentSecretKeys = new Set(form.secrets.map((row) => row.key.trim()))
    originalSecretKeys.forEach((key) => {
      if (!currentSecretKeys.has(key)) {
        secrets[key] = ''
      }
    })

    const data: IntegrationWriteBody = {
      name: form.name.trim(),
      enabled: form.enabled,
      trigger: {
        resource: form.triggerResource,
        operation: form.triggerOperation,
      },
      conditions: form.conditions.filter((c) => c.propertyPath.trim() && c.value.trim()),
      action: {
        endpoint: form.endpoint.trim(),
        data: {
          objects: form.payloadObjects,
          ...(Object.keys(transforms).length > 0 ? { transforms } : {}),
        },
      },
      connection: {
        type: form.connectionType,
        secrets,
        ...(form.hmacEnabled
          ? { hmac: { enabled: true, headerName: form.hmacHeaderName.trim() } }
          : { hmac: { enabled: false } }),
      },
      retryPolicy: {
        maxAttempts: form.maxAttempts,
        backoffSeconds: form.backoffSeconds,
      },
    }

    await onSubmit(data)
  }, [form, isFormValid, onSubmit])

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div style={{ display: 'none' }} />
      <Dialog size="L">
        {({ close }) => (
          <>
            <Heading slot="title">{isEditing ? 'Edit Webhook Integration' : 'New Webhook Integration'}</Heading>
            <Content>
              <Form>
                <Tabs aria-label="Integration settings" selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
                  <TabList>
                    <Tab id="trigger">Trigger</Tab>
                    <Tab id="conditions">Conditions</Tab>
                    <Tab id="payload">Payload</Tab>
                    <Tab id="connection">Connection</Tab>
                    <Tab id="retry">Retry</Tab>
                  </TabList>

                  {/* ── Trigger ── */}
                  <TabPanel id="trigger">
                    <div className={style({ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 })}>
                      <TextField
                        label="Name"
                        value={form.name}
                        onChange={(v) => updateField('name', v)}
                        isRequired
                        styles={style({ width: '[100%]' })}
                      />
                      <div className={style({ display: 'flex', gap: 16 })}>
                        <Picker
                          label="Resource"
                          selectedKey={form.triggerResource}
                          onSelectionChange={(key) => key != null && updateField('triggerResource', String(key))}
                          styles={style({ flexGrow: 1 })}
                        >
                          {TRIGGER_RESOURCES.map((r) => (
                            <PickerItem key={r.key} id={r.key}>{r.label}</PickerItem>
                          ))}
                        </Picker>
                        <Picker
                          label="Operation"
                          selectedKey={form.triggerOperation}
                          onSelectionChange={(key) => key != null && updateField('triggerOperation', key as IntegrationTriggerOperation)}
                          styles={style({ flexGrow: 1 })}
                        >
                          {TRIGGER_OPERATIONS.map((o) => (
                            <PickerItem key={o.key} id={o.key}>{o.label}</PickerItem>
                          ))}
                        </Picker>
                      </div>
                      <Switch isSelected={form.enabled} onChange={(v) => updateField('enabled', v)}>
                        Enabled
                      </Switch>
                      <Text UNSAFE_style={TYPOGRAPHY.HELPER_TEXT}>
                        Fires a webhook whenever <strong>{form.triggerResource}.{form.triggerOperation}</strong> occurs in this scope.
                      </Text>
                    </div>
                  </TabPanel>

                  {/* ── Conditions ── */}
                  <TabPanel id="conditions">
                    <div className={style({ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 })}>
                      <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                        <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>Conditions (all must match)</Text>
                        <ActionButton isQuiet onPress={addCondition}>
                          <Add />
                          <Text>Add Condition</Text>
                        </ActionButton>
                      </div>
                      {form.conditions.length === 0 ? (
                        <Text UNSAFE_style={{ fontSize: 14, color: 'var(--spectrum-global-color-gray-600)', fontStyle: 'italic' }}>
                          No conditions — the webhook fires on every matching trigger.
                        </Text>
                      ) : (
                        <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
                          {form.conditions.map((condition, index) => (
                            <div key={index} className={style({ display: 'flex', gap: 8, alignItems: 'end' })}>
                              <TextField
                                label="Property path"
                                placeholder="e.g. published"
                                value={condition.propertyPath}
                                onChange={(v) => updateCondition(index, { propertyPath: v })}
                                styles={style({ flexGrow: 1 })}
                              />
                              <Picker
                                label="Operator"
                                selectedKey={condition.operator}
                                onSelectionChange={(key) => key != null && updateCondition(index, { operator: key as ConditionOperator })}
                                styles={style({ width: 176 })}
                              >
                                {CONDITION_OPERATORS.map((o) => (
                                  <PickerItem key={o.key} id={o.key}>{o.label}</PickerItem>
                                ))}
                              </Picker>
                              <TextField
                                label="Value"
                                value={condition.value}
                                onChange={(v) => updateCondition(index, { value: v })}
                                styles={style({ flexGrow: 1 })}
                              />
                              <ActionButton isQuiet aria-label="Remove condition" onPress={() => removeCondition(index)}>
                                <RemoveCircle />
                              </ActionButton>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabPanel>

                  {/* ── Payload ── */}
                  <TabPanel id="payload">
                    <div className={style({ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 })}>
                      <TextField
                        label="Endpoint URL"
                        placeholder="https://example.com/webhooks/emc"
                        value={form.endpoint}
                        onChange={(v) => updateField('endpoint', v)}
                        isRequired
                        styles={style({ width: '[100%]' })}
                      />
                      <div>
                        <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>Objects to include in payload</Text>
                        <div className={style({ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 })}>
                          {PAYLOAD_OBJECTS.map((object) => {
                            const isSelected = form.payloadObjects.includes(object)
                            const mappingRows = form.transforms[object] || []
                            return (
                              <div
                                key={object}
                                className={style({ backgroundColor: 'gray-75', borderWidth: 1, borderColor: 'gray-300', borderRadius: 'sm', paddingX: 12, paddingY: 8 })}
                              >
                                <Checkbox
                                  isSelected={isSelected}
                                  onChange={(v) => togglePayloadObject(object, v)}
                                >
                                  {object}
                                </Checkbox>
                                {isSelected && (
                                  <div className={style({ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 })} style={{ paddingLeft: 28 }}>
                                    <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                                      <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-700)' }}>
                                        Field renaming (optional)
                                      </Text>
                                      <ActionButton isQuiet size="S" onPress={() => addMappingRow(object)}>
                                        <Add />
                                        <Text>Add Mapping</Text>
                                      </ActionButton>
                                    </div>
                                    {mappingRows.map((row, index) => (
                                      <div key={index} className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                                        <TextField
                                          aria-label="Source field"
                                          placeholder="source field"
                                          value={row.source}
                                          onChange={(v) => updateMappingRow(object, index, { source: v })}
                                          styles={style({ flexGrow: 1 })}
                                        />
                                        <Text>→</Text>
                                        <TextField
                                          aria-label="Renamed field"
                                          placeholder="renamed field"
                                          value={row.target}
                                          onChange={(v) => updateMappingRow(object, index, { target: v })}
                                          styles={style({ flexGrow: 1 })}
                                        />
                                        <ActionButton isQuiet aria-label="Remove mapping" onPress={() => removeMappingRow(object, index)}>
                                          <RemoveCircle />
                                        </ActionButton>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </TabPanel>

                  {/* ── Connection ── */}
                  <TabPanel id="connection">
                    <div className={style({ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 })}>
                      <Picker
                        label="Connection type"
                        selectedKey={form.connectionType}
                        onSelectionChange={(key) => key != null && updateField('connectionType', key as ConnectionType)}
                        styles={style({ width: '[100%]', maxWidth: 400 })}
                      >
                        {CONNECTION_TYPES.map((t) => (
                          <PickerItem key={t.key} id={t.key}>{t.label}</PickerItem>
                        ))}
                      </Picker>

                      <div>
                        <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                          <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>Secrets</Text>
                          <ActionButton isQuiet onPress={addSecretRow}>
                            <Add />
                            <Text>Add Secret</Text>
                          </ActionButton>
                        </div>
                        {form.secrets.length === 0 ? (
                          <Text UNSAFE_style={{ fontSize: 14, color: 'var(--spectrum-global-color-gray-600)', fontStyle: 'italic', marginTop: 8, display: 'block' }}>
                            No secrets configured.
                          </Text>
                        ) : (
                          <div className={style({ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 })}>
                            {form.secrets.map((row, index) => (
                              <div key={index} className={style({ display: 'flex', gap: 8, alignItems: 'end' })}>
                                <TextField
                                  label="Key"
                                  value={row.key}
                                  isReadOnly={row.isSet}
                                  onChange={(v) => updateSecretRow(index, { key: v })}
                                  styles={style({ flexGrow: 1 })}
                                />
                                {row.isSet && !row.isEditable ? (
                                  <>
                                    <TextField
                                      label="Value"
                                      value="••••••••"
                                      isReadOnly
                                      styles={style({ flexGrow: 1 })}
                                    />
                                    <ActionButton onPress={() => updateSecretRow(index, { isEditable: true })}>
                                      <Edit />
                                      <Text>Replace</Text>
                                    </ActionButton>
                                  </>
                                ) : (
                                  <TextField
                                    label="Value"
                                    type="password"
                                    value={row.value}
                                    onChange={(v) => updateSecretRow(index, { value: v })}
                                    styles={style({ flexGrow: 1 })}
                                  />
                                )}
                                <ActionButton isQuiet aria-label="Remove secret" onPress={() => removeSecretRow(index)}>
                                  <RemoveCircle />
                                </ActionButton>
                              </div>
                            ))}
                          </div>
                        )}
                        <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)', marginTop: 8, display: 'block' }}>
                          Secret values are never displayed once saved. Click &quot;Replace&quot; to overwrite an existing secret.
                        </Text>
                      </div>

                      <Switch isSelected={form.hmacEnabled} onChange={(v) => updateField('hmacEnabled', v)}>
                        Sign requests with HMAC
                      </Switch>
                      {form.hmacEnabled && (
                        <TextField
                          label="HMAC header name"
                          placeholder="X-Webhook-Signature"
                          value={form.hmacHeaderName}
                          onChange={(v) => updateField('hmacHeaderName', v)}
                          isRequired
                          styles={style({ width: '[100%]', maxWidth: 400 })}
                        />
                      )}
                    </div>
                  </TabPanel>

                  {/* ── Retry ── */}
                  <TabPanel id="retry">
                    <div className={style({ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 })}>
                      <NumberField
                        label="Max attempts"
                        value={form.maxAttempts}
                        onChange={(v) => updateField('maxAttempts', v)}
                        minValue={1}
                        maxValue={10}
                        styles={style({ width: 200 })}
                      />
                      <div>
                        <div className={style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
                          <Text UNSAFE_style={TYPOGRAPHY.FIELD_LABEL}>Backoff schedule (seconds between retries)</Text>
                          <ActionButton isQuiet onPress={addBackoffStep} isDisabled={form.backoffSeconds.length >= MAX_BACKOFF_STEPS}>
                            <Add />
                            <Text>Add Step</Text>
                          </ActionButton>
                        </div>
                        <div className={style({ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 })}>
                          {form.backoffSeconds.map((seconds, index) => (
                            <div key={index} className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                              <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)', minWidth: 60 }}>
                                Retry {index + 1}
                              </Text>
                              <NumberField
                                aria-label={`Backoff seconds for retry ${index + 1}`}
                                value={seconds}
                                onChange={(v) => updateBackoffStep(index, v)}
                                minValue={1}
                                maxValue={MAX_BACKOFF_SECONDS}
                                styles={style({ flexGrow: 1 })}
                              />
                              <ActionButton
                                isQuiet
                                aria-label="Remove step"
                                onPress={() => removeBackoffStep(index)}
                                isDisabled={form.backoffSeconds.length <= 1}
                              >
                                <RemoveCircle />
                              </ActionButton>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabPanel>
                </Tabs>
              </Form>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={() => { onClose(); close() }} isDisabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="accent" onPress={handleSubmit} isDisabled={!isFormValid || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <ProgressCircle size="S" isIndeterminate aria-label="Submitting" />
                    <Text>Saving...</Text>
                  </>
                ) : (
                  <Text>{isEditing ? 'Update Integration' : 'Create Integration'}</Text>
                )}
              </Button>
            </ButtonGroup>
          </>
        )}
      </Dialog>
    </DialogTrigger>
  )
}
