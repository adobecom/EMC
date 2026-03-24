/*
* Dev Token Button Component
* Shows a button/badge to manage dev tokens (only visible in dev mode)
*/

import React, { useState, useEffect } from 'react'
import { Text, Tooltip, TooltipTrigger } from '@adobe/react-spectrum'
import { ActionButton, Badge } from "@react-spectrum/s2"
import { style } from "@react-spectrum/s2/style" with { type: "macro" }
import Key from "@react-spectrum/s2/icons/Key"
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
    // Dev token UI only when ?devtokenmode=true on an allowed host
    return env.isDevTokenModeEnabled()
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
          <div className={style({ display: 'flex', alignItems: 'center', gap: 8 })}>
            <Key />
            <Text>Dev Token</Text>
            <Badge variant={hasValidToken ? 'positive' : 'neutral'}>
              {hasValidToken ? 'Active' : 'None'}
            </Badge>
          </div>
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
