/* 
* <license header>
*/

import React from 'react'
import { Flex, ProgressCircle, Text } from '@adobe/react-spectrum'

interface LoadingSpinnerProps {
  message?: string
  size?: 'S' | 'M' | 'L'
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'M'
}) => {
  return (
    <Flex
      direction="column"
      gap="size-200"
      justifyContent="center"
      alignItems="center"
      height="100%"
      minHeight="size-3000"
    >
      <ProgressCircle size={size} aria-label="Loading" isIndeterminate />
      <Text>{message}</Text>
    </Flex>
  )
}

