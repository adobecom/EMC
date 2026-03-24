/*
* <license header>
*/

import React, { useEffect, useState } from 'react'
import { View, Text } from '@adobe/react-spectrum'
import { Button } from "@react-spectrum/s2"
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Close from '@spectrum-icons/workflow/Close'
import CheckmarkCircle from '@spectrum-icons/workflow/CheckmarkCircle'
import AlertCircle from '@spectrum-icons/workflow/AlertCircle'
import InfoOutline from '@spectrum-icons/workflow/InfoOutline'
import { useToast, Toast, ToastVariant } from '../../contexts/ToastContext'
import { Z_INDEX } from '../../styles/designSystem'

// ============================================================================
// STYLES
// ============================================================================

const TOAST_CONTAINER_STYLES: React.CSSProperties = {
  position: 'fixed',
  top: 72, // Below the global nav (56px) + some padding
  right: 24,
  zIndex: Z_INDEX.NOTIFICATION,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxWidth: 420,
  pointerEvents: 'none', // Allow clicking through container
}

const getToastStyles = (variant: ToastVariant, isExiting: boolean): React.CSSProperties => {
  const baseStyles: React.CSSProperties = {
    padding: '14px 16px',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
    pointerEvents: 'auto', // Make toast clickable
    transform: isExiting ? 'translateX(120%)' : 'translateX(0)',
    opacity: isExiting ? 0 : 1,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    minWidth: 320,
  }

  // Variant-specific styles
  const variantStyles: Record<ToastVariant, React.CSSProperties> = {
    positive: {
      backgroundColor: '#0d6e3f', // Darker green for better contrast
      color: '#ffffff',
      borderLeft: '4px solid #34d399',
    },
    negative: {
      backgroundColor: '#b91c1c', // Dark red
      color: '#ffffff',
      borderLeft: '4px solid #f87171',
    },
    info: {
      backgroundColor: '#1e40af', // Dark blue
      color: '#ffffff',
      borderLeft: '4px solid #60a5fa',
    },
    neutral: {
      backgroundColor: '#374151', // Dark gray
      color: '#ffffff',
      borderLeft: '4px solid #9ca3af',
    },
  }

  return { ...baseStyles, ...variantStyles[variant] }
}

const ICON_STYLES: React.CSSProperties = {
  flexShrink: 0,
}

const MESSAGE_STYLES: React.CSSProperties = {
  flex: 1,
  fontSize: 14,
  lineHeight: '20px',
  fontWeight: 500,
}

const CLOSE_BUTTON_STYLES: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 4,
  cursor: 'pointer',
  borderRadius: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s ease',
  color: 'rgba(255, 255, 255, 0.8)',
  flexShrink: 0,
}

// ============================================================================
// TOAST ITEM COMPONENT
// ============================================================================

interface ToastItemProps {
  toast: Toast
  onDismiss: () => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false)
  const [isEntering, setIsEntering] = useState(true)

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(onDismiss, 300) // Wait for exit animation
  }

  const getIcon = () => {
    const iconProps = { size: 'S' as const, UNSAFE_style: ICON_STYLES }

    switch (toast.variant) {
      case 'positive':
        return <CheckmarkCircle {...iconProps} />
      case 'negative':
        return <AlertCircle {...iconProps} />
      case 'info':
        return <InfoOutline {...iconProps} />
      case 'neutral':
      default:
        return <InfoOutline {...iconProps} />
    }
  }

  const entryTransform = isEntering ? 'translateX(120%)' : 'translateX(0)'

  return (
    <div
      style={{
        ...getToastStyles(toast.variant, isExiting),
        transform: isEntering ? entryTransform : (isExiting ? 'translateX(120%)' : 'translateX(0)'),
      }}
      role="alert"
      aria-live={toast.variant === 'negative' ? 'assertive' : 'polite'}
    >
      <div className={style({ display: 'flex', alignItems: 'start', gap: 12 })}>
        {/* Icon */}
        <View UNSAFE_style={{ marginTop: 2 }}>
          {getIcon()}
        </View>

        {/* Message */}
        <View flex UNSAFE_style={{ minWidth: 0 }}>
          <Text UNSAFE_style={MESSAGE_STYLES}>
            {toast.message}
          </Text>

          {/* Action button if provided */}
          {toast.action && (
            <View marginTop="size-100">
              <Button
                variant="secondary"
                staticColor="white"
                onPress={() => {
                  toast.action?.onPress()
                  handleDismiss()
                }}
              >
                {toast.action.label}
              </Button>
            </View>
          )}
        </View>

        {/* Close button */}
        {toast.dismissible && (
          <button
            onClick={handleDismiss}
            style={CLOSE_BUTTON_STYLES}
            aria-label="Dismiss notification"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <Close size="S" />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// TOAST CONTAINER COMPONENT
// ============================================================================

/**
 * ToastContainer - Renders all active toasts
 *
 * Place this component once at the app root level, inside the ToastProvider.
 * Toasts will automatically appear here when triggered via useToast().
 *
 * @example
 * ```tsx
 * // In App.tsx
 * <ToastProvider>
 *   <Router>
 *     <YourApp />
 *   </Router>
 *   <ToastContainer />
 * </ToastProvider>
 * ```
 */
export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) {
    return null
  }

  return (
    <div style={TOAST_CONTAINER_STYLES} aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismiss(toast.id)}
        />
      ))}
    </div>
  )
}
