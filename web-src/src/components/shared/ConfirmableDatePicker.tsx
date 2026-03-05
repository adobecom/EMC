/* 
* <license header>
*/

import React, { useState, useEffect, useCallback } from 'react'
import {
  DatePicker,
  Flex,
  ActionButton,
} from '@adobe/react-spectrum'
import Checkmark from '@spectrum-icons/workflow/Checkmark'
import { CalendarDateTime } from '@internationalized/date'

interface ConfirmableDatePickerProps {
  label: string
  isRequired?: boolean
  granularity?: 'day' | 'hour' | 'minute' | 'second'
  value: CalendarDateTime | null
  onChange: (date: CalendarDateTime | null) => void
  minValue?: CalendarDateTime
  maxValue?: CalendarDateTime
}

export const ConfirmableDatePicker: React.FC<ConfirmableDatePickerProps> = ({
  label,
  isRequired,
  granularity = 'minute',
  value,
  onChange,
  minValue,
  maxValue,
}) => {
  const [localValue, setLocalValue] = useState<CalendarDateTime | null>(value)
  const [hasUnconfirmed, setHasUnconfirmed] = useState(false)

  useEffect(() => {
    if (!hasUnconfirmed) {
      setLocalValue(value)
    }
  }, [value, hasUnconfirmed])

  const handleChange = useCallback((date: CalendarDateTime | null) => {
    setLocalValue(date)
    setHasUnconfirmed(true)
  }, [])

  const handleConfirm = useCallback(() => {
    onChange(localValue)
    setHasUnconfirmed(false)
  }, [localValue, onChange])

  return (
    <Flex alignItems="end" gap="size-50">
      <DatePicker
        label={label}
        isRequired={isRequired}
        granularity={granularity}
        value={localValue}
        onChange={handleChange}
        minValue={minValue}
        maxValue={maxValue}
      />
      {hasUnconfirmed && (
        <ActionButton
          onPress={handleConfirm}
          aria-label="Confirm date and time"
          UNSAFE_style={{
            backgroundColor: 'var(--spectrum-global-color-blue-500)',
            color: 'white',
            borderRadius: '4px',
            minWidth: '32px',
            height: '32px',
          }}
        >
          <Checkmark size="S" />
        </ActionButton>
      )}
    </Flex>
  )
}
