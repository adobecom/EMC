/* 
* <license header>
*/

import React, { ReactNode } from 'react'

interface FormCardProps {
  children: ReactNode
}

/**
 * FormCard - A white card container for form sections
 * Replicates v1 styling with proper React Spectrum practices
 */
export const FormCard: React.FC<FormCardProps> = ({ children }) => {
  return (
    <div
      style={{
        borderRadius: 8,
        marginBottom: 24,
        boxShadow: '0 3px 6px 0 rgb(0 0 0 / 16%)',
        padding: '24px 56px',
        backgroundColor: '#FFFFFF',
      }}
    >
      {children}
    </div>
  )
}

