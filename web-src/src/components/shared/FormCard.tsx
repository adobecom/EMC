/* 
* <license header>
*/

import React, { ReactNode } from 'react'
import { View } from '@adobe/react-spectrum'

interface FormCardProps {
  children: ReactNode
}

/**
 * FormCard - A white card container for form sections
 * Replicates v1 styling with proper React Spectrum practices
 */
export const FormCard: React.FC<FormCardProps> = ({ children }) => {
  return (
    <View
      borderRadius="medium"
      padding="size-400"
      UNSAFE_style={{
        margin: '24px',
        boxShadow: '0 3px 6px 0 rgb(0 0 0 / 16%)',
        paddingLeft: '56px',
        paddingRight: '56px',
        backgroundColor: '#FFFFFF'
      }}
    >
      {children}
    </View>
  )
}

