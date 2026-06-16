/*
* <license header>
*/

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Text,
  Heading,
  Divider,
  TextField,
  Picker,
  PickerItem,
  Button,
  ActionButton,
  ProgressCircle,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Add from '@react-spectrum/s2/icons/Add'
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle'
import { HeadingWithTooltip, FormCard } from '../../components/shared'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { useGroup } from '../../contexts/GroupContext'
import { cachedApi } from '../../services/api'
import { hasAttributesSlice } from '../../types/configApi'
import type { CustomAttributeConfig, CustomAttributeValue } from '../../types/configApi'
import type { EventCustomAttributeValue } from '../../types/domain'

// ============================================================================
// MultiSelectRepeater sub-component
// ============================================================================

interface RepeaterRow {
  id: string
  value: string
}

interface MultiSelectRepeaterProps {
  attr: CustomAttributeConfig
  values: EventCustomAttributeValue[]
  onChange: (selectedValues: string[]) => void
}

const MultiSelectRepeater: React.FC<MultiSelectRepeaterProps> = ({ attr, values, onChange }) => {
  const sortedOptions = attr.values.slice().sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))

  const rowsFromValues = (vals: EventCustomAttributeValue[]): RepeaterRow[] =>
    vals.map((v, i) => ({ id: `row-${attr.attributeId}-${i}-${v.value}`, value: v.value }))

  const [rows, setRows] = useState<RepeaterRow[]>(() => rowsFromValues(values))

  // Sync from external changes (e.g., form load) without re-triggering on local updates
  const prevValuesRef = useRef<string>(JSON.stringify(values.map(v => v.value)))
  const localUpdateRef = useRef(false)

  useEffect(() => {
    if (localUpdateRef.current) {
      localUpdateRef.current = false
      prevValuesRef.current = JSON.stringify(values.map(v => v.value))
      return
    }
    const serialized = JSON.stringify(values.map(v => v.value))
    if (serialized === prevValuesRef.current) return
    setRows(rowsFromValues(values))
    prevValuesRef.current = serialized
  }, [values]) // eslint-disable-line react-hooks/exhaustive-deps

  const getAvailableOptions = (currentRowValue: string): CustomAttributeValue[] => {
    const otherSelected = rows.map(r => r.value).filter(v => v && v !== currentRowValue)
    return sortedOptions.filter(opt => !otherSelected.includes(opt.value))
  }

  const allOptionsUsed = rows.filter(r => r.value).length >= sortedOptions.length

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { id: `row-${attr.attributeId}-${Date.now()}`, value: '' }])
  }, [attr.attributeId])

  const removeRow = useCallback((id: string) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id)
      localUpdateRef.current = true
      onChange(next.map(r => r.value).filter(Boolean))
      return next
    })
  }, [onChange])

  const handleChange = useCallback((id: string, value: string) => {
    setRows(prev => {
      const next = prev.map(r => r.id === id ? { ...r, value } : r)
      localUpdateRef.current = true
      onChange(next.map(r => r.value).filter(Boolean))
      return next
    })
  }, [onChange])

  return (
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
      {rows.map(row => (
        <div key={row.id} className={style({ display: 'flex', alignItems: 'center', gap: 8 })}>
          <Picker
            aria-label={`Select ${attr.name}`}
            placeholder={`Select ${attr.name}`}
            selectedKey={row.value || null}
            onSelectionChange={(key) => handleChange(row.id, String(key))}
            styles={style({ flexGrow: 1 })}
          >
            {getAvailableOptions(row.value).map(opt => (
              <PickerItem key={opt.value} id={opt.value}>{opt.label || opt.value}</PickerItem>
            ))}
          </Picker>
          <ActionButton
            isQuiet
            aria-label="Remove"
            onPress={() => removeRow(row.id)}
          >
            <RemoveCircle />
          </ActionButton>
        </div>
      ))}

      {!allOptionsUsed && (
        <Button
          variant="secondary"
          onPress={addRow}
          styles={style({ alignSelf: 'start' })}
        >
          <Add />
          <Text>Add</Text>
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// CustomAttributesComponent
// ============================================================================

export const CustomAttributesComponent: React.FC = () => {
  const { formData, updateFormData } = useEventFormComponent({
    componentId: 'customAttributes',
  })

  const { activeGroup } = useGroup()
  const [attributes, setAttributes] = useState<CustomAttributeConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const scopeId = activeGroup?.scopeId
    if (!scopeId) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const result = await cachedApi.getConfig(scopeId)
        if (result !== null && !('error' in result)) {
          const attr = hasAttributesSlice(result) ? result.customAttributes : null
          const enabled = (attr && attr.enabled !== false) ? [attr] : []
          setAttributes(enabled)
          updateFormData({ _customAttributeConfigs: enabled })
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [activeGroup?.scopeId])

  // ============================================================================
  // VALUE HELPERS
  // ============================================================================

  const currentValues: EventCustomAttributeValue[] = formData.customAttributes || []

  const getTextValue = (attr: CustomAttributeConfig): string =>
    currentValues.find(v => v.attributeId === attr.attributeId)?.value ?? ''

  const getSingleSelectValue = (attr: CustomAttributeConfig): string =>
    currentValues.find(v => v.attributeId === attr.attributeId)?.value ?? ''

  const getMultiSelectValues = (attr: CustomAttributeConfig): EventCustomAttributeValue[] =>
    currentValues.filter(v => v.attributeId === attr.attributeId)

  // ============================================================================
  // UPDATE HELPERS
  // ============================================================================

  const updateTextValue = (attr: CustomAttributeConfig, value: string) => {
    const others = currentValues.filter(v => v.attributeId !== attr.attributeId)
    const entry: EventCustomAttributeValue[] = value
      ? [{ attributeId: attr.attributeId, attribute: attr.name, valueId: '', value }]
      : []
    updateFormData({ customAttributes: [...others, ...entry] })
  }

  const updateSingleSelectValue = (attr: CustomAttributeConfig, selectedValue: string) => {
    const others = currentValues.filter(v => v.attributeId !== attr.attributeId)
    if (!selectedValue) {
      updateFormData({ customAttributes: others })
      return
    }
    const opt = attr.values.find(v => v.value === selectedValue)
    if (!opt) return
    updateFormData({
      customAttributes: [
        ...others,
        {
          attributeId: attr.attributeId,
          attribute: attr.name,
          valueId: opt.valueId,
          value: opt.value,
          ordinal: opt.ordinal,
        },
      ],
    })
  }

  const updateMultiSelectValue = useCallback((attr: CustomAttributeConfig, selectedValues: string[]) => {
    const others = currentValues.filter(v => v.attributeId !== attr.attributeId)
    const newEntries: EventCustomAttributeValue[] = selectedValues.map((sv, i) => {
      const opt = attr.values.find(v => v.value === sv)
      return {
        attributeId: attr.attributeId,
        attribute: attr.name,
        valueId: opt?.valueId ?? '',
        value: sv,
        ordinal: i,
      }
    })
    updateFormData({ customAttributes: [...others, ...newEntries] })
  }, [currentValues, updateFormData])

  // ============================================================================
  // RENDER
  // ============================================================================

  const renderInput = (attr: CustomAttributeConfig) => {
    switch (attr.inputType) {
      case 'text':
        return (
          <TextField
            label={attr.name}
            isRequired={attr.isRequired === true}
            value={getTextValue(attr)}
            onChange={(v) => updateTextValue(attr, v)}
          />
        )

      case 'single-select':
        return (
          <Picker
            label={attr.name}
            isRequired={attr.isRequired === true}
            selectedKey={getSingleSelectValue(attr) || null}
            onSelectionChange={(key) => updateSingleSelectValue(attr, String(key))}
            styles={style({ alignSelf: 'start' })}
          >
            {attr.values
              .slice()
              .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
              .map(v => (
                <PickerItem key={v.value} id={v.value}>{v.label || v.value}</PickerItem>
              ))
            }
          </Picker>
        )

      case 'multi-select':
        return (
          <MultiSelectRepeater
            attr={attr}
            values={getMultiSelectValues(attr)}
            onChange={(selectedValues) => updateMultiSelectValue(attr, selectedValues)}
          />
        )

      default:
        return null
    }
  }

  return (
    <FormCard>
      <div className={style({ display: 'flex', flexDirection: 'column', gap: 24 })}>
        <div className={style({ display: 'flex', alignItems: 'center', gap: 12 })}>
          <HeadingWithTooltip
            level={3}
            tooltip="Custom attributes enable downstream system integrations and data mapping for advanced event configurations."
          >
            Custom Attributes
          </HeadingWithTooltip>
          {loading && <ProgressCircle isIndeterminate aria-label="Loading custom attributes" size="S" />}
        </div>
        <Text>
          These fields support advanced custom downstream integrations and data mapping purposes.
        </Text>

        {!loading && attributes.length === 0 && (
          <Text>No active custom attributes are configured for this scope.</Text>
        )}

        {attributes.map((attr, index) => (
          <React.Fragment key={attr.attributeId}>
            {index > 0 && <Divider size="S" />}
            <div className={style({ display: 'flex', flexDirection: 'column', gap: 12 })}>
              <Heading level={4}>
                {attr.label || attr.name}
                {attr.isRequired && attr.inputType === 'multi-select' && (
                  <Text UNSAFE_style={{ fontWeight: 400 }}> (Required)</Text>
                )}
              </Heading>
              {renderInput(attr)}
            </div>
          </React.Fragment>
        ))}
      </div>
    </FormCard>
  )
}
