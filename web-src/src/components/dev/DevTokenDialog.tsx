/* 
* Dev Token Dialog Component
* Provides a UI for developers to input and manage Adobe IMS tokens in local development
*/

import React, { useState, useEffect } from 'react'
import {
  View,
  StatusLight,
  AlertDialog,
  DialogContainer as V3DialogContainer
} from '@adobe/react-spectrum'
import { Text, Button, ButtonGroup, TextArea, Dialog, DialogContainer, Content, Heading } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { tokenStorage } from '../../services/tokenStorage'

interface DevTokenDialogProps {
  isOpen: boolean
  onTokenSaved: (token: string) => void
  onDismiss?: () => void
  mode?: 'required' | 'optional'
}

export const DevTokenDialog: React.FC<DevTokenDialogProps> = ({ 
  isOpen, 
  onTokenSaved, 
  onDismiss,
  mode = 'optional'
}) => {
  const [tokenInput, setTokenInput] = useState('')
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [existingToken, setExistingToken] = useState<string | null>(null)
  const [expirationInfo, setExpirationInfo] = useState<any>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    // Check for existing token when dialog opens
    if (isOpen) {
      const token = tokenStorage.getValidToken()
      setExistingToken(token)
      
      if (token) {
        const info = tokenStorage.getTokenExpiration()
        setExpirationInfo(info)
      }
    }
  }, [isOpen])

  const validateAndSaveToken = () => {
    setIsValid(null)
    setErrorMessage('')

    if (!tokenInput.trim()) {
      setIsValid(false)
      setErrorMessage('Please paste a token')
      return
    }

    const parsedToken = tokenStorage.parseTokenInput(tokenInput.trim())
    
    if (!parsedToken) {
      setIsValid(false)
      setErrorMessage('Invalid token format. Please paste a valid Adobe IMS token.')
      return
    }

    // Save the token
    tokenStorage.saveToken(parsedToken)
    setIsValid(true)
    setTokenInput('')
    
    // Notify parent component
    setTimeout(() => {
      onTokenSaved(parsedToken.token)
    }, 500)
  }

  const handleClearToken = () => {
    tokenStorage.clearToken()
    setExistingToken(null)
    setExpirationInfo(null)
    setShowClearConfirm(false)
    setTokenInput('')
    setIsValid(null)
    setErrorMessage('')
  }

  const handleContinueWithoutToken = () => {
    if (onDismiss) {
      onDismiss()
    }
  }

  const handleUseExistingToken = () => {
    if (existingToken) {
      onTokenSaved(existingToken)
    }
  }

  return (
    <>
      <DialogContainer onDismiss={mode === 'optional' ? handleContinueWithoutToken : () => { return }}>
        {isOpen && (
          <Dialog size="L">
            {() => (
              <>
                <Heading slot="title">Developer Authentication</Heading>
                <Content>
                  <View>
                    {existingToken ? (
                      <View marginBottom="size-300">
                        <View marginBottom="size-150">
                          <StatusLight variant="positive">
                            <Text>
                              <strong>Active Token Found</strong>
                            </Text>
                          </StatusLight>
                        </View>
                        {expirationInfo && (
                          <View marginBottom="size-200" marginStart="size-400">
                            <Text>
                              <strong>Expires:</strong> {new Date(expirationInfo.expiresAt).toLocaleString()}
                            </Text>
                            <br />
                            <Text>
                              <strong>Time Remaining:</strong> {expirationInfo.timeRemaining}
                            </Text>
                          </View>
                        )}
                        <View marginStart="size-400">
                          <ButtonGroup>
                            <Button variant="accent" onPress={handleUseExistingToken}>
                              Use Existing Token
                            </Button>
                            <Button variant="negative" onPress={() => setShowClearConfirm(true)}>
                              Clear Token
                            </Button>
                          </ButtonGroup>
                        </View>
                        <View marginTop="size-300" marginBottom="size-300">
                          <hr style={{ border: 'none', borderTop: '1px solid var(--spectrum-global-color-gray-300)' }} />
                        </View>
                        <Text>
                          <strong>Or paste a new token below:</strong>
                        </Text>
                      </View>
                    ) : (
                      <View marginBottom="size-300">
                        <StatusLight variant="notice">
                          <Text>
                            <strong>No Token Found</strong>
                          </Text>
                        </StatusLight>
                        <View marginTop="size-150" marginStart="size-400">
                          <Text>
                            To use this app in local development, you need to provide an Adobe IMS token.
                          </Text>
                        </View>
                      </View>
                    )}

                    <View marginBottom="size-150">
                      <Text>
                        <strong>How to get a token:</strong>
                      </Text>
                      <ol style={{ marginTop: '8px', marginBottom: '16px', paddingLeft: '40px' }}>
                        <li>
                          Open{' '}
                          <a
                            href="https://dev--ecc-milo--adobecom.aem.live/ecc/dashboard/t3"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--spectrum-global-color-blue-600)' }}
                          >
                            https://dev--ecc-milo--adobecom.aem.live/ecc/dashboard/t3
                          </a>
                          {' '}and sign in
                        </li>
                        <li>Open Developer Tools (F12)</li>
                        <li>In the Console, run: <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>window.adobeIMS?.getAccessToken()</code></li>
                        <li>Copy the entire token object or just the token string</li>
                        <li>Paste it below</li>
                      </ol>
                    </View>

                    <TextArea
                      label="Adobe IMS Token"
                      styles={style({ width: '[100%]' })}
                      value={tokenInput}
                      onChange={setTokenInput}
                      placeholder='Paste token object: { "token": "eyJ...", "expire": "2025-..." } or just the token string'
                      isInvalid={isValid === false}
                      description={isValid === true ? 'Token saved successfully!' : ''}
                      errorMessage={errorMessage}
                    />

                    {mode === 'optional' && (
                      <View marginTop="size-200">
                        <Text>
                          <em>Note: You can continue without a token, but API calls will fail.</em>
                        </Text>
                      </View>
                    )}
                  </View>
                </Content>
                <ButtonGroup>
                  <Button variant="accent" onPress={validateAndSaveToken}>
                    Save Token
                  </Button>
                  {mode === 'optional' && !existingToken && (
                    <Button variant="secondary" onPress={handleContinueWithoutToken}>
                      Continue Without Token
                    </Button>
                  )}
                </ButtonGroup>
              </>
            )}
          </Dialog>
        )}
      </DialogContainer>

      <V3DialogContainer onDismiss={() => setShowClearConfirm(false)}>
        {showClearConfirm && (
          <AlertDialog
            variant="destructive"
            title="Clear Token"
            primaryActionLabel="Clear"
            secondaryActionLabel="Cancel"
            onPrimaryAction={handleClearToken}
            onSecondaryAction={() => setShowClearConfirm(false)}
          >
            Are you sure you want to clear the stored token? You'll need to paste a new one to make API calls.
          </AlertDialog>
        )}
      </V3DialogContainer>
    </>
  )
}

export default DevTokenDialog

