/* 
* <license header>
*/

import React from 'react'
import { ProgressCircle, Text } from '@react-spectrum/s2'

interface LoadingSpinnerProps {
  message?: string
  size?: 'S' | 'M' | 'L'
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'M'
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        minHeight: 240,
      }}
    >
      <ProgressCircle size={size} aria-label="Loading" isIndeterminate />
      <Text>{message}</Text>
    </div>
  )
}

