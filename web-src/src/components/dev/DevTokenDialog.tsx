/* 
* Dev Token Dialog Component
* Provides a UI for developers to input and manage Adobe IMS tokens in local development
*/

import React, { useState, useEffect } from 'react'
import {
  Text,
  Button,
  ButtonGroup,
  TextArea,
  Dialog,
  DialogContainer,
  Content,
  Heading,
  DialogTrigger,
  AlertDialog,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { tokenStorage } from '../../services/tokenStorage'

interface DevTokenDialogProps {
  isOpen: boolean
  onTokenSaved: (token: string) => void
  onDismiss?: () => void
  mode?: 'required' | 'optional'
}

const statusRowStyle = (variant: 'positive' | 'notice'): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  borderRadius: 6,
  marginBottom: 12,
  background:
    variant === 'positive'
      ? 'var(--spectrum-alias-status-positive-color-transparent, rgba(45, 157, 120, 0.12))'
      : 'var(--spectrum-alias-status-info-color-transparent, rgba(59, 130, 246, 0.12))',
  borderLeft: `3px solid ${
    variant === 'positive'
      ? 'var(--spectrum-global-color-green-600)'
      : 'var(--spectrum-global-color-blue-500)'
  }`,
})

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

    tokenStorage.saveToken(parsedToken)
    setIsValid(true)
    setTokenInput('')

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
      <DialogContainer onDismiss={mode === 'optional' ? handleContinueWithoutToken : () => {}}>
        {isOpen && (
          <Dialog size="L">
            {() => (
              <>
                <Heading slot="title">Developer Authentication</Heading>
                <Content>
                  <div>
                    {existingToken ? (
                      <div style={{ marginBottom: 24 }}>
                        <div style={statusRowStyle('positive')}>
                          <Text>
                            <strong>Active Token Found</strong>
                          </Text>
                        </div>
                        {expirationInfo && (
                          <div style={{ marginBottom: 16, marginLeft: 32 }}>
                            <Text>
                              <strong>Expires:</strong> {new Date(expirationInfo.expiresAt).toLocaleString()}
                            </Text>
                            <br />
                            <Text>
                              <strong>Time Remaining:</strong> {expirationInfo.timeRemaining}
                            </Text>
                          </div>
                        )}
                        <div style={{ marginLeft: 32 }}>
                          <ButtonGroup>
                            <Button variant="accent" onPress={handleUseExistingToken}>
                              Use Existing Token
                            </Button>
                            <Button variant="negative" onPress={() => setShowClearConfirm(true)}>
                              Clear Token
                            </Button>
                          </ButtonGroup>
                        </div>
                        <div style={{ marginTop: 24, marginBottom: 24 }}>
                          <hr style={{ border: 'none', borderTop: '1px solid var(--spectrum-global-color-gray-300)' }} />
                        </div>
                        <Text>
                          <strong>Or paste a new token below:</strong>
                        </Text>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 24 }}>
                        <div style={statusRowStyle('notice')}>
                          <Text>
                            <strong>No Token Found</strong>
                          </Text>
                        </div>
                        <div style={{ marginTop: 12, marginLeft: 32 }}>
                          <Text>
                            To use this app in local development, you need to provide an Adobe IMS token.
                          </Text>
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: 12 }}>
                      <Text>
                        <strong>How to get a token:</strong>
                      </Text>
                      <ol style={{ marginTop: 8, marginBottom: 16, paddingLeft: 40 }}>
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
                        <li>In the Console, run: <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 3 }}>window.adobeIMS?.getAccessToken()</code></li>
                        <li>Copy the entire token object or just the token string</li>
                        <li>Paste it below</li>
                      </ol>
                    </div>

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
                      <div style={{ marginTop: 16 }}>
                        <Text>
                          <em>Note: You can continue without a token, but API calls will fail.</em>
                        </Text>
                      </div>
                    )}
                  </div>
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

      <DialogTrigger
        isOpen={showClearConfirm}
        onOpenChange={(open) => !open && setShowClearConfirm(false)}
      >
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Clear Token"
          variant="destructive"
          primaryActionLabel="Clear"
          cancelLabel="Cancel"
          onPrimaryAction={handleClearToken}
          onCancel={() => setShowClearConfirm(false)}
        >
          Are you sure you want to clear the stored token? You&apos;ll need to paste a new one to make API calls.
        </AlertDialog>
      </DialogTrigger>
    </>
  )
}

export default DevTokenDialog
