/* 
* Dev Token Button Component
* Shows a button/badge to manage dev tokens (only visible in dev mode)
*/

import React, { useState, useEffect } from 'react'
import { ActionButton, Badge, Flex, Text, Tooltip, TooltipTrigger } from '@adobe/react-spectrum'
import Key from '@spectrum-icons/workflow/Key'
import { tokenStorage } from '../../services/tokenStorage'
import { DevTokenDialog } from './DevTokenDialog'
import { env } from '../../config/env'

interface DevTokenButtonProps {
  onTokenChange?: (token: string | null) => void
}

export const DevTokenButton: React.FC<DevTokenButtonProps> = ({ onTokenChange }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [hasValidToken, setHasValidToken] = useState(false)
  const [expirationInfo, setExpirationInfo] = useState<any>(null)
  const [isDevMode] = useState(() => {
    // Show dev token UI on localhost and allowed dev instances
    // (never in Experience Cloud Shell - runtime detection handles that in index.tsx)
    return env.isDevelopment()
  })

  const checkToken = () => {
    const isValid = tokenStorage.isTokenValid()
    setHasValidToken(isValid)
    
    if (isValid) {
      const info = tokenStorage.getTokenExpiration()
      setExpirationInfo(info)
    } else {
      setExpirationInfo(null)
    }
  }

  useEffect(() => {
    if (!isDevMode) {
      return
    }
    
    checkToken()
    
    // Check token validity every minute
    const interval = setInterval(checkToken, 60000)
    return () => clearInterval(interval)
  }, [isDevMode])

  const handleTokenSaved = (token: string) => {
    setIsDialogOpen(false)
    checkToken()
    
    if (onTokenChange) {
      onTokenChange(token)
    }
    
    // Reload the page to apply the new token
    window.location.reload()
  }

  const handleDismiss = () => {
    setIsDialogOpen(false)
    checkToken()
  }

  if (!isDevMode) {
    return null
  }

  return (
    <>
      <TooltipTrigger delay={0}>
        <ActionButton 
          onPress={() => setIsDialogOpen(true)}
          isQuiet
        >
          <Flex alignItems="center" gap="size-100">
            <Key />
            <Text>Dev Token</Text>
            <Badge variant={hasValidToken ? 'positive' : 'neutral'}>
              {hasValidToken ? 'Active' : 'None'}
            </Badge>
          </Flex>
        </ActionButton>
        <Tooltip variant="info">
          {hasValidToken && expirationInfo ? (
            <div>
              <strong>Token Active</strong>
              <br />
              Expires in: {expirationInfo.timeRemaining}
              <br />
              Click to manage
            </div>
          ) : (
            <div>
              <strong>No Token</strong>
              <br />
              Click to add a dev token
            </div>
          )}
        </Tooltip>
      </TooltipTrigger>

      <DevTokenDialog
        isOpen={isDialogOpen}
        onTokenSaved={handleTokenSaved}
        onDismiss={handleDismiss}
        mode="optional"
      />
    </>
  )
}

export default DevTokenButton

