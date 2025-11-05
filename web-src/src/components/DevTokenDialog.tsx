/* 
* Dev Token Dialog Component
* Provides a UI for developers to input and manage Adobe IMS tokens in local development
*/

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContainer,
  Heading,
  Divider,
  Content,
  ButtonGroup,
  Button,
  TextArea,
  Text,
  View,
  StatusLight,
  AlertDialog
} from '@adobe/react-spectrum'
import { tokenStorage } from '../services/tokenStorage'

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
      <DialogContainer onDismiss={mode === 'optional' ? handleContinueWithoutToken : undefined}>
        {isOpen && (
          <Dialog size="L">
            <Heading>🔐 Developer Authentication</Heading>
            <Divider />
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
                    <Divider size="S" marginTop="size-300" marginBottom="size-300" />
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
                        href="https://adobe.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: 'var(--spectrum-global-color-blue-600)' }}
                      >
                        adobe.com
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
                  width="100%"
                  height="size-2400"
                  value={tokenInput}
                  onChange={setTokenInput}
                  placeholder='Paste token object: { "token": "eyJ...", "expire": "2025-..." } or just the token string'
                  validationState={isValid === false ? 'invalid' : isValid === true ? 'valid' : undefined}
                  description={isValid === true ? '✅ Token saved successfully!' : ''}
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
          </Dialog>
        )}
      </DialogContainer>

      <DialogContainer onDismiss={() => setShowClearConfirm(false)}>
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
      </DialogContainer>
    </>
  )
}

export default DevTokenDialog

