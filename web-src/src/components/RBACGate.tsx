/**
 * RBACGate — blocks rendering until authorization is resolved.
 * If the user is not in users.json, shows a "no access" screen.
 */

import React, { ReactNode } from 'react'
import { Provider, defaultTheme } from '@adobe/react-spectrum'
import { useRBAC } from '../contexts/RBACContext'
import { GateScreen } from './shared/GateScreen'

interface RBACGateProps {
  children: ReactNode
}

export const RBACGate: React.FC<RBACGateProps> = ({ children }) => {
  const { isLoading, hasAccess } = useRBAC()

  if (isLoading) {
    return (
      <Provider theme={defaultTheme} colorScheme="light" scale="medium">
        <GateScreen onRequestAccess={() => {}} isLoading />
      </Provider>
    )
  }

  if (!hasAccess) {
    return (
      <Provider theme={defaultTheme} colorScheme="light" scale="medium">
        <GateScreen onRequestAccess={() => window.location.reload()} />
      </Provider>
    )
  }

  return <>{children}</>
}

export default RBACGate
