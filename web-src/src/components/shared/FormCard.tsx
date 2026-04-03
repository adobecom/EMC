/* 
* <license header>
*/

import React, { ReactNode } from 'react'
import { SURFACES } from '../../styles/designSystem'

interface FormCardProps {
  children: ReactNode
}

/**
 * FormCard — raised surface inside event/series wizards (`SURFACES.FORM_CARD`)
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
        backgroundColor: SURFACES.FORM_CARD,
      }}
    >
      {children}
    </div>
  )
}

