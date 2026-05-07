import React, { useState, useCallback, useEffect } from 'react'
import {
  Button,
  ButtonGroup,
  Dialog,
  DialogTrigger,
  Content,
  Heading,
  Text,
  TextField,
  TextArea,
  Switch,
  Picker,
  PickerItem,
  Checkbox,
  CheckboxGroup,
  NumberField,
  Badge,
  Divider,
  ActionButton,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Add from '@react-spectrum/s2/icons/Add'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown'
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight'
import { SPACING, COLORS, FORM_SPACING } from '../../styles/designSystem'
import type {
  Integration,
  IntegrationCreateBody,
  TriggerConfig,
  TriggerResource,
  TriggerOperation,
  ConnectionParameter,
  AuthType,
  ConditionLeafRule,
  ConditionOperator,
} from '../../types/integrationApi'
import { TRIGGER_RESOURCES, TRIGGER_OPERATIONS, PAYLOAD_OBJECTS } from '../../types/integrationApi'

// ============================================================================
// Form State Types
// ============================================================================

interface TriggerFormState {
  resource: TriggerResource
  operations: TriggerOperation[]
  conditionsEnabled: boolean
  conditions: Array<{ property: string; operator: ConditionOperator; value: string }>
  conditionLogic: 'and' | 'or'
}

interface ParameterFormState {
  key: string
  value: string
  secret: boolean
  // For existing secret params already saved server-side
  isSet?: boolean
  secretRef?: string
}

interface MappingEntry {
  source: string
  destination: string
}

interface TransformFormState {
  [object: string]: MappingEntry[]
}

interface FormState {
  name: string
  description: string
  enabled: boolean
  endpoint: string
  authType: AuthType
  parameters: ParameterFormState[]
  maxAttempts: number
  backoff0: number
  backoff1: number
  backoff2: number
  triggers: TriggerFormState[]
  payloadObjects: string[]
  extraObjects: string
  transforms: TransformFormState
}

// ============================================================================
// Helpers
// ============================================================================

const RESOURCE_LABELS: Record<TriggerResource, string> = {
  event: 'Event',
  session: 'Session',
  series: 'Series',
  speaker: 'Speaker',
  sponsor: 'Sponsor',
}

const OPERATION_LABELS: Record<TriggerOperation, string> = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
}

const AUTH_LABELS: Record<AuthType, string> = {
  none: 'None',
  bearer: 'Bearer Token',
  api_key: 'API Key',
  hmac: 'HMAC Signature',
}

const CONDITION_OPERATORS: { key: ConditionOperator; label: string }[] = [
  { key: 'eq', label: '= (equals)' },
  { key: 'ne', label: '≠ (not equals)' },
  { key: 'gt', label: '> (greater than)' },
  { key: 'ge', label: '≥ (greater or equal)' },
  { key: 'lt', label: '< (less than)' },
  { key: 'le', label: '≤ (less or equal)' },
]

function makeEmptyTrigger(): TriggerFormState {
  return {
    resource: 'event',
    operations: ['create'],
    conditionsEnabled: false,
    conditions: [],
    conditionLogic: 'and',
  }
}

function makeEmptyCondition() {
  return { property: '', operator: 'eq' as ConditionOperator, value: '' }
}

function makeEmptyParam(): ParameterFormState {
  return { key: '', value: '', secret: false }
}

function initFromIntegration(integration: Integration | null): FormState {
  if (!integration) {
    return {
      name: '',
      description: '',
      enabled: true,
      endpoint: '',
      authType: 'none',
      parameters: [],
      maxAttempts: 3,
      backoff0: 30,
      backoff1: 120,
      backoff2: 600,
      triggers: [makeEmptyTrigger()],
      payloadObjects: ['event'],
      extraObjects: '',
      transforms: {},
    }
  }

  const conn = integration.connection
  const retry = conn.retryPolicy
  const params: ParameterFormState[] = (conn.parameters || []).map(p => ({
    key: p.key,
    value: '',
    secret: p.secret ?? false,
    isSet: p.isSet,
    secretRef: p.secretRef,
  }))

  const triggers: TriggerFormState[] = (integration.triggers || []).map(t => {
    const rules = t.conditions?.rules || []
    // A single group rule wraps leaves with an explicit AND/OR combinator
    const groupRule = rules.length === 1 && 'operator' in rules[0] ? rules[0] : null
    const leafRules = groupRule
      ? (groupRule as { operator: 'and' | 'or'; rules: ConditionLeafRule[] }).rules.filter((r): r is ConditionLeafRule => 'property' in r)
      : rules.filter((r): r is ConditionLeafRule => 'property' in r)
    const conditionLogic: 'and' | 'or' = groupRule
      ? (groupRule as { operator: 'and' | 'or' }).operator
      : 'and'
    return {
      resource: t.resource,
      operations: [...t.operations],
      conditionsEnabled: rules.length > 0,
      conditions: leafRules.map(r => ({ property: r.property, operator: r.operator, value: r.value })),
      conditionLogic,
    }
  })

  const stdObjects = PAYLOAD_OBJECTS as readonly string[]
  const payloadObjects = (integration.payload.objects || []).filter(o => stdObjects.includes(o))
  const extra = (integration.payload.objects || []).filter(o => !stdObjects.includes(o))

  const transforms: TransformFormState = {}
  for (const [obj, t] of Object.entries(integration.payload.transforms || {})) {
    if (t?.mapping) {
      transforms[obj] = Object.entries(t.mapping).map(([src, dst]) => ({ source: src, destination: dst }))
    }
  }

  return {
    name: integration.name,
    description: integration.description || '',
    enabled: integration.enabled,
    endpoint: conn.endpoint,
    authType: conn.auth?.type || 'none',
    parameters: params,
    maxAttempts: retry?.maxAttempts ?? 3,
    backoff0: retry?.backoffSeconds?.[0] ?? 30,
    backoff1: retry?.backoffSeconds?.[1] ?? 120,
    backoff2: retry?.backoffSeconds?.[2] ?? 600,
    triggers: triggers.length > 0 ? triggers : [makeEmptyTrigger()],
    payloadObjects,
    extraObjects: extra.join(', '),
    transforms,
  }
}

function buildPayload(state: FormState): IntegrationCreateBody {
  const triggers: TriggerConfig[] = state.triggers.map(t => {
    const trigger: TriggerConfig = {
      resource: t.resource,
      operations: t.operations,
    }
    if (t.conditionsEnabled && t.conditions.length > 0) {
      const validRules = t.conditions.filter(c => c.property.trim())
      if (validRules.length > 0) {
        const leafRules: ConditionLeafRule[] = validRules.map(c => ({
          property: c.property.trim(),
          operator: c.operator,
          value: c.value,
        }))
        if (leafRules.length === 1) {
          trigger.conditions = { rules: leafRules }
        } else {
          trigger.conditions = { rules: [{ operator: t.conditionLogic, rules: leafRules }] }
        }
      }
    }
    return trigger
  })

  const params = state.authType !== 'none' ? state.parameters.filter(p => p.key.trim()) : []
  const parameters: ConnectionParameter[] = params.map(p => {
    const param: ConnectionParameter = { key: p.key.trim(), secret: p.secret }
    if (p.value.trim()) param.value = p.value.trim()
    if (p.secretRef) param.secretRef = p.secretRef
    return param
  })

  const allObjects: string[] = [...state.payloadObjects]
  const extra = state.extraObjects.split(',').map(s => s.trim()).filter(Boolean)
  allObjects.push(...extra)

  const transforms: Record<string, { mapping: Record<string, string> }> = {}
  for (const [obj, entries] of Object.entries(state.transforms)) {
    const valid = entries.filter(e => e.source.trim() && e.destination.trim())
    if (valid.length > 0) {
      transforms[obj] = {
        mapping: Object.fromEntries(valid.map(e => [e.source.trim(), e.destination.trim()]))
      }
    }
  }

  return {
    name: state.name.trim(),
    description: state.description.trim() || undefined,
    enabled: state.enabled,
    triggers,
    connection: {
      type: 'webhook',
      endpoint: state.endpoint.trim(),
      method: 'POST',
      auth: state.authType !== 'none' ? { type: state.authType } : undefined,
      parameters: parameters.length > 0 ? parameters : undefined,
      retryPolicy: {
        maxAttempts: state.maxAttempts,
        backoffSeconds: [state.backoff0, state.backoff1, state.backoff2],
      },
    },
    payload: {
      objects: allObjects,
      transforms: Object.keys(transforms).length > 0 ? transforms : undefined,
    },
  }
}

// ============================================================================
// Section heading helper
// ============================================================================

const SectionHeading: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ marginBottom: SPACING.SM }}>
    <Text UNSAFE_style={{
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: COLORS.GRAY_600,
    }}>
      {label}
    </Text>
    <Divider />
  </div>
)

// ============================================================================
// Transforms section
// ============================================================================

interface TransformsSectionProps {
  objects: string[]
  transforms: TransformFormState
  onChange: (t: TransformFormState) => void
}

const TransformsSection: React.FC<TransformsSectionProps> = ({ objects, transforms, onChange }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpanded = (obj: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(obj) ? next.delete(obj) : next.add(obj)
      return next
    })
  }

  const addMapping = (obj: string) => {
    const existing = transforms[obj] || []
    onChange({ ...transforms, [obj]: [...existing, { source: '', destination: '' }] })
    setExpanded(prev => new Set([...prev, obj]))
  }

  const updateMapping = (obj: string, idx: number, field: 'source' | 'destination', value: string) => {
    const entries = [...(transforms[obj] || [])]
    entries[idx] = { ...entries[idx], [field]: value }
    onChange({ ...transforms, [obj]: entries })
  }

  const removeMapping = (obj: string, idx: number) => {
    const entries = [...(transforms[obj] || [])]
    entries.splice(idx, 1)
    onChange({ ...transforms, [obj]: entries })
  }

  if (objects.length === 0) {
    return <Text UNSAFE_style={{ fontSize: 13, color: COLORS.GRAY_600 }}>Select payload objects above to configure field mapping.</Text>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.SM }}>
      {objects.map(obj => {
        const entries = transforms[obj] || []
        const isExpanded = expanded.has(obj)
        return (
          <div key={obj} style={{ border: `1px solid ${COLORS.GRAY_200}`, borderRadius: 6 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${SPACING.SM}px ${SPACING.MD}px`, cursor: 'pointer' }}
              onClick={() => toggleExpanded(obj)}
            >
              <Text UNSAFE_style={{ fontWeight: 500, fontSize: 14 }}>
                {obj}
                {entries.length > 0 && (
                  <span style={{ marginLeft: 8, color: COLORS.GRAY_600, fontSize: 12 }}>
                    ({entries.length} mapping{entries.length !== 1 ? 's' : ''})
                  </span>
                )}
              </Text>
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </div>

            {isExpanded && (
              <div style={{ padding: `0 ${SPACING.MD}px ${SPACING.MD}px` }}>
                {entries.length === 0 && (
                  <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_600 }}>No mappings yet. Add one below.</Text>
                )}
                {entries.map((entry, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: SPACING.SM, marginTop: SPACING.SM, alignItems: 'center' }}>
                    <TextField
                      label={idx === 0 ? 'Source field' : ''}
                      aria-label="Source field"
                      value={entry.source}
                      onChange={v => updateMapping(obj, idx, 'source', v)}
                      placeholder="e.g. eventId"
                    />
                    <TextField
                      label={idx === 0 ? 'Destination field' : ''}
                      aria-label="Destination field"
                      value={entry.destination}
                      onChange={v => updateMapping(obj, idx, 'destination', v)}
                      placeholder="e.g. id"
                    />
                    <ActionButton
                      isQuiet
                      onPress={() => removeMapping(obj, idx)}
                      aria-label="Remove mapping"
                      UNSAFE_style={{ marginTop: idx === 0 ? 20 : 0 }}
                    >
                      <RemoveCircle />
                    </ActionButton>
                  </div>
                ))}
                <div style={{ marginTop: SPACING.SM }}>
                  <ActionButton isQuiet onPress={() => addMapping(obj)}>
                    <Add />
                    <Text>Add mapping</Text>
                  </ActionButton>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

interface IntegrationFormDialogProps {
  integration: Integration | null
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (data: IntegrationCreateBody) => Promise<void>
}

export const IntegrationFormDialog: React.FC<IntegrationFormDialogProps> = ({
  integration, isOpen, isSubmitting, onClose, onSubmit
}) => {
  const [form, setForm] = useState<FormState>(() => initFromIntegration(integration))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      setForm(initFromIntegration(integration))
      setErrors({})
    }
  }, [isOpen, integration])

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }, [errors])

  // ---- Trigger helpers ----
  const updateTrigger = (idx: number, patch: Partial<TriggerFormState>) => {
    setForm(prev => {
      const triggers = [...prev.triggers]
      triggers[idx] = { ...triggers[idx], ...patch }
      return { ...prev, triggers }
    })
  }

  const addTrigger = () => {
    setForm(prev => ({ ...prev, triggers: [...prev.triggers, makeEmptyTrigger()] }))
  }

  const removeTrigger = (idx: number) => {
    setForm(prev => ({ ...prev, triggers: prev.triggers.filter((_, i) => i !== idx) }))
  }

  // ---- Parameter helpers ----
  const updateParam = (idx: number, patch: Partial<ParameterFormState>) => {
    setForm(prev => {
      const parameters = [...prev.parameters]
      parameters[idx] = { ...parameters[idx], ...patch }
      return { ...prev, parameters }
    })
  }

  const addParam = () => {
    setForm(prev => ({ ...prev, parameters: [...prev.parameters, makeEmptyParam()] }))
  }

  const removeParam = (idx: number) => {
    setForm(prev => ({ ...prev, parameters: prev.parameters.filter((_, i) => i !== idx) }))
  }

  // ---- Validation ----
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.endpoint.trim()) {
      newErrors.endpoint = 'Endpoint URL is required'
    } else {
      try {
        const url = new URL(form.endpoint.trim())
        if (url.protocol !== 'https:') newErrors.endpoint = 'Endpoint must use HTTPS'
      } catch {
        newErrors.endpoint = 'Enter a valid URL'
      }
    }
    if (form.triggers.length === 0) {
      newErrors.triggers = 'At least one trigger is required'
    } else {
      for (const t of form.triggers) {
        if (t.operations.length === 0) {
          newErrors.triggers = 'Each trigger must have at least one operation selected'
          break
        }
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [form])

  const handleSubmit = useCallback(async () => {
    if (!validate()) return
    const payload = buildPayload(form)
    await onSubmit(payload)
  }, [form, onSubmit, validate])

  const allPayloadObjects = [
    ...form.payloadObjects,
    ...form.extraObjects.split(',').map(s => s.trim()).filter(Boolean),
  ]

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <div style={{ display: 'none' }} />
      <Dialog size="L">
        <Content>
          <Heading level={2}>
            {integration ? 'Edit Integration' : 'New Integration'}
          </Heading>

          <div style={{ overflowY: 'auto', maxHeight: '70vh', paddingRight: SPACING.SM }}>

            {/* ---- Basic ---- */}
            <div style={{ marginTop: SPACING.LG, marginBottom: SPACING.LG }}>
              <SectionHeading label="Basic" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: FORM_SPACING.FIELD_GAP }}>
                <TextField
                  label="Name"
                  value={form.name}
                  onChange={v => set('name', v)}
                  isRequired
                  errorMessage={errors.name}
                  isInvalid={!!errors.name}
                  placeholder="e.g. Event sync to CRM"
                />
                <TextArea
                  label="Description"
                  value={form.description}
                  onChange={v => set('description', v)}
                  placeholder="What does this integration do?"
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
                  <Switch isSelected={form.enabled} onChange={v => set('enabled', v)}>
                    Enabled
                  </Switch>
                  {form.enabled
                    ? <Badge variant="positive">Active</Badge>
                    : <Badge variant="neutral">Inactive</Badge>}
                </div>
              </div>
            </div>

            {/* ---- Connection ---- */}
            <div style={{ marginBottom: SPACING.LG }}>
              <SectionHeading label="Connection" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: FORM_SPACING.FIELD_GAP }}>
                <TextField
                  label="Endpoint URL"
                  value={form.endpoint}
                  onChange={v => set('endpoint', v)}
                  isRequired
                  errorMessage={errors.endpoint}
                  isInvalid={!!errors.endpoint}
                  placeholder="https://example.com/webhook"
                  description="Must use HTTPS"
                />

                <Picker
                  label="Authentication"
                  selectedKey={form.authType}
                  onSelectionChange={k => set('authType', k as AuthType)}
                >
                  {Object.entries(AUTH_LABELS).map(([key, label]) => (
                    <PickerItem key={key} id={key}>{label}</PickerItem>
                  ))}
                </Picker>

                {/* Parameters table (shown for auth types that need credentials) */}
                {(form.authType !== 'none') && (
                  <div>
                    <Text UNSAFE_style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: SPACING.SM }}>
                      Credentials / Parameters
                    </Text>
                    {form.parameters.length === 0 && (
                      <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_600, display: 'block', marginBottom: SPACING.SM }}>
                        No parameters yet.
                      </Text>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.SM }}>
                      {form.parameters.map((param, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: SPACING.SM, alignItems: 'flex-end' }}>
                          <TextField
                            label={idx === 0 ? 'Key' : ''}
                            aria-label="Parameter key"
                            value={param.key}
                            onChange={v => updateParam(idx, { key: v })}
                            placeholder="e.g. apiKey"
                          />
                          <div>
                            {param.isSet && !param.value && (
                              <div style={{ marginBottom: 4 }}>
                                <Badge variant="informative">Secret stored</Badge>
                              </div>
                            )}
                            <TextField
                              label={idx === 0 ? 'Value' : ''}
                              aria-label="Parameter value"
                              type={param.secret ? 'password' : 'text'}
                              value={param.value}
                              onChange={v => updateParam(idx, { value: v })}
                              placeholder={param.isSet ? 'Leave blank to keep existing' : 'Enter value'}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 2 }}>
                            <Checkbox
                              isSelected={param.secret}
                              onChange={v => updateParam(idx, { secret: v })}
                              aria-label="Secret"
                            >
                              Secret
                            </Checkbox>
                          </div>
                          <ActionButton isQuiet onPress={() => removeParam(idx)} aria-label="Remove parameter">
                            <RemoveCircle />
                          </ActionButton>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: SPACING.SM }}>
                      <ActionButton isQuiet onPress={addParam}>
                        <Add />
                        <Text>Add parameter</Text>
                      </ActionButton>
                    </div>
                  </div>
                )}

                {/* Retry policy */}
                <div>
                  <Text UNSAFE_style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: SPACING.SM }}>
                    Retry Policy
                  </Text>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: SPACING.SM }}>
                    <NumberField
                      label="Max Attempts"
                      value={form.maxAttempts}
                      onChange={v => set('maxAttempts', v)}
                      minValue={1}
                      maxValue={10}
                    />
                    <NumberField
                      label="Delay 1 (s)"
                      value={form.backoff0}
                      onChange={v => set('backoff0', v)}
                      minValue={0}
                    />
                    <NumberField
                      label="Delay 2 (s)"
                      value={form.backoff1}
                      onChange={v => set('backoff1', v)}
                      minValue={0}
                    />
                    <NumberField
                      label="Delay 3 (s)"
                      value={form.backoff2}
                      onChange={v => set('backoff2', v)}
                      minValue={0}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Triggers ---- */}
            <div style={{ marginBottom: SPACING.LG }}>
              <SectionHeading label="Triggers" />
              {errors.triggers && (
                <Text UNSAFE_style={{ color: COLORS.RED_600, fontSize: 13, display: 'block', marginBottom: SPACING.SM }}>
                  {errors.triggers}
                </Text>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.MD }}>
                {form.triggers.map((trigger, tidx) => (
                  <div key={tidx} style={{ border: `1px solid ${COLORS.GRAY_200}`, borderRadius: 6, padding: SPACING.MD }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.MD }}>
                      <div style={{ display: 'flex', gap: SPACING.MD, flexWrap: 'wrap', flex: 1 }}>
                        <Picker
                          label="Resource"
                          selectedKey={trigger.resource}
                          onSelectionChange={k => updateTrigger(tidx, { resource: k as TriggerResource })}
                          styles={style({ width: 160 })}
                        >
                          {TRIGGER_RESOURCES.map(r => (
                            <PickerItem key={r} id={r}>{RESOURCE_LABELS[r]}</PickerItem>
                          ))}
                        </Picker>

                        <div>
                          <Text UNSAFE_style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: SPACING.XS }}>
                            Operations
                          </Text>
                          <div style={{ display: 'flex', gap: SPACING.SM }}>
                            {TRIGGER_OPERATIONS.map(op => (
                              <Checkbox
                                key={op}
                                isSelected={trigger.operations.includes(op)}
                                onChange={checked => {
                                  const ops = checked
                                    ? [...trigger.operations, op]
                                    : trigger.operations.filter(o => o !== op)
                                  updateTrigger(tidx, { operations: ops })
                                }}
                              >
                                {OPERATION_LABELS[op]}
                              </Checkbox>
                            ))}
                          </div>
                        </div>
                      </div>

                      {form.triggers.length > 1 && (
                        <ActionButton isQuiet onPress={() => removeTrigger(tidx)} aria-label="Remove trigger">
                          <RemoveCircle />
                        </ActionButton>
                      )}
                    </div>

                    {/* Conditions toggle */}
                    <div style={{ marginTop: SPACING.SM }}>
                      <Switch
                        isSelected={trigger.conditionsEnabled}
                        onChange={v => updateTrigger(tidx, {
                          conditionsEnabled: v,
                          conditions: v && trigger.conditions.length === 0 ? [makeEmptyCondition()] : trigger.conditions
                        })}
                      >
                        Add conditions (filter when to fire)
                      </Switch>
                    </div>

                    {trigger.conditionsEnabled && (
                      <div style={{ marginTop: SPACING.SM, paddingLeft: SPACING.MD, borderLeft: `2px solid ${COLORS.GRAY_200}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM, marginBottom: SPACING.SM }}>
                          <Text UNSAFE_style={{ fontSize: 13 }}>Match</Text>
                          <Picker
                            label=""
                            aria-label="Condition logic"
                            selectedKey={trigger.conditionLogic}
                            onSelectionChange={k => updateTrigger(tidx, { conditionLogic: k as 'and' | 'or' })}
                            styles={style({ width: 100 })}
                          >
                            <PickerItem id="and">ALL</PickerItem>
                            <PickerItem id="or">ANY</PickerItem>
                          </Picker>
                          <Text UNSAFE_style={{ fontSize: 13 }}>of the following conditions:</Text>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.SM }}>
                          {trigger.conditions.map((cond, cidx) => (
                            <div key={cidx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: SPACING.SM, alignItems: 'flex-end' }}>
                              <TextField
                                label={cidx === 0 ? 'Property path' : ''}
                                aria-label="Property path"
                                value={cond.property}
                                onChange={v => {
                                  const conditions = [...trigger.conditions]
                                  conditions[cidx] = { ...conditions[cidx], property: v }
                                  updateTrigger(tidx, { conditions })
                                }}
                                placeholder="e.g. event.status"
                              />
                              <Picker
                                label={cidx === 0 ? 'Operator' : ''}
                                aria-label="Operator"
                                selectedKey={cond.operator}
                                onSelectionChange={k => {
                                  const conditions = [...trigger.conditions]
                                  conditions[cidx] = { ...conditions[cidx], operator: k as ConditionOperator }
                                  updateTrigger(tidx, { conditions })
                                }}
                              >
                                {CONDITION_OPERATORS.map(op => (
                                  <PickerItem key={op.key} id={op.key}>{op.label}</PickerItem>
                                ))}
                              </Picker>
                              <TextField
                                label={cidx === 0 ? 'Value' : ''}
                                aria-label="Condition value"
                                value={cond.value}
                                onChange={v => {
                                  const conditions = [...trigger.conditions]
                                  conditions[cidx] = { ...conditions[cidx], value: v }
                                  updateTrigger(tidx, { conditions })
                                }}
                                placeholder="e.g. published"
                              />
                              <ActionButton
                                isQuiet
                                onPress={() => {
                                  const conditions = trigger.conditions.filter((_, i) => i !== cidx)
                                  updateTrigger(tidx, { conditions })
                                }}
                                aria-label="Remove condition"
                                UNSAFE_style={{ marginTop: cidx === 0 ? 20 : 0 }}
                              >
                                <RemoveCircle />
                              </ActionButton>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: SPACING.SM }}>
                          <ActionButton
                            isQuiet
                            onPress={() => updateTrigger(tidx, { conditions: [...trigger.conditions, makeEmptyCondition()] })}
                          >
                            <Add />
                            <Text>Add condition</Text>
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div>
                  <ActionButton isQuiet onPress={addTrigger}>
                    <Add />
                    <Text>Add trigger</Text>
                  </ActionButton>
                </div>
              </div>
            </div>

            {/* ---- Payload ---- */}
            <div style={{ marginBottom: SPACING.LG }}>
              <SectionHeading label="Payload" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: FORM_SPACING.FIELD_GAP }}>

                <div>
                  <Text UNSAFE_style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: SPACING.SM }}>
                    Objects to include
                  </Text>
                  <CheckboxGroup
                    label=""
                    aria-label="Payload objects"
                    value={form.payloadObjects}
                    onChange={v => set('payloadObjects', v)}
                    orientation="horizontal"
                  >
                    {PAYLOAD_OBJECTS.map(obj => (
                      <Checkbox key={obj} value={obj}>{obj.charAt(0).toUpperCase() + obj.slice(1)}</Checkbox>
                    ))}
                  </CheckboxGroup>
                </div>

                <TextField
                  label="Additional objects (comma-separated)"
                  value={form.extraObjects}
                  onChange={v => set('extraObjects', v)}
                  placeholder="e.g. config.publishing.profile, config.localizations"
                  description="Custom object paths beyond the standard set"
                />

                <div>
                  <Text UNSAFE_style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: SPACING.SM }}>
                    Field mapping transforms
                  </Text>
                  <Text UNSAFE_style={{ fontSize: 12, color: COLORS.GRAY_600, display: 'block', marginBottom: SPACING.SM }}>
                    Map source field names to destination field names for each object type.
                  </Text>
                  <TransformsSection
                    objects={allPayloadObjects}
                    transforms={form.transforms}
                    onChange={t => set('transforms', t)}
                  />
                </div>
              </div>
            </div>
          </div>

          <Divider />
          <ButtonGroup>
            <Button variant="secondary" onPress={onClose}>Cancel</Button>
            <Button
              variant="accent"
              onPress={handleSubmit}
              isDisabled={isSubmitting}
              isPending={isSubmitting}
            >
              {integration ? 'Save changes' : 'Create integration'}
            </Button>
          </ButtonGroup>
        </Content>
      </Dialog>
    </DialogTrigger>
  )
}
