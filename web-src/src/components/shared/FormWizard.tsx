/* 
* <license header>
*/

import React, { useState, useCallback } from 'react'
import {
  View,
  Flex,
  Button,
  ProgressBar,
  Heading,
  Text
} from '@adobe/react-spectrum'
import { useNavigate } from 'react-router-dom'
import ChevronLeft from '@spectrum-icons/workflow/ChevronLeft'
import ChevronRight from '@spectrum-icons/workflow/ChevronRight'
import WebPage from '@spectrum-icons/workflow/WebPage'
import Document from '@spectrum-icons/workflow/Document'
import Checkmark from '@spectrum-icons/workflow/Checkmark'
import LockClosed from '@spectrum-icons/workflow/LockClosed'
import { 
  SIDE_NAV_STICKY_STYLES, 
  SCROLLABLE_CONTENT_STYLES, 
  FIXED_ACTION_BAR_STYLES,
  COLORS,
  TYPOGRAPHY
} from '../../styles/designSystem'

export interface WizardStep {
  id: string
  title: string
  description?: string
  component: React.ReactNode
  isValid?: boolean
}

/** Event type for display in the header */
export type EventTypeLabel = 'In-person event' | 'Webinar' | 'Hybrid event' | string

/** Event status for the status badge */
export type EventStatus = 'draft' | 'published' | 'archived' | 'cancelled' | string

interface FormWizardProps {
  steps: WizardStep[]
  /** Called when the final publish/re-publish button is clicked */
  onComplete: () => Promise<void> | void
  /** Called when Save button is clicked - should save without advancing */
  onSave?: () => Promise<boolean> | boolean
  /** Called when navigating to next step - should save before advancing */
  onNextStep?: () => Promise<boolean> | boolean
  onCancel?: () => void
  /** Called when a preview is requested */
  onPreview?: (previewType: 'pre-event' | 'post-event') => void
  isSubmitting?: boolean
  showSideNav?: boolean
  /** Whether the event has been saved at least once (has an eventId) */
  hasEventId?: boolean
  /** Whether the event is currently published */
  isPublished?: boolean
  /** Highest step index the user has reached (for unlocking navigation) */
  maxStepReached?: number
  /** Callback when max step changes */
  onMaxStepChange?: (stepIndex: number) => void
  /** Event type label to display above the step heading */
  eventTypeLabel?: EventTypeLabel
  /** Event status for the status badge (defaults to 'draft' or 'published' based on isPublished) */
  eventStatus?: EventStatus
}

export const FormWizard: React.FC<FormWizardProps> = ({
  steps,
  onComplete,
  onSave,
  onNextStep,
  onCancel,
  onPreview,
  isSubmitting = false,
  showSideNav = false,
  hasEventId = false,
  isPublished = false,
  maxStepReached = 0,
  onMaxStepChange,
  eventTypeLabel,
  eventStatus
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isNavigating, setIsNavigating] = useState(false)
  const navigate = useNavigate()

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1
  const progress = ((currentStepIndex + 1) / steps.length) * 100
  
  // Determine if a step is accessible
  const isStepAccessible = useCallback((stepIndex: number): boolean => {
    // Step 0 is always accessible
    if (stepIndex === 0) return true
    
    // Other steps require an eventId (saved at least once) and having reached that step
    return hasEventId && stepIndex <= maxStepReached
  }, [hasEventId, maxStepReached])

  // Update max step reached when advancing
  const updateMaxStep = useCallback((newStepIndex: number) => {
    if (newStepIndex > maxStepReached) {
      onMaxStepChange?.(newStepIndex)
    }
  }, [maxStepReached, onMaxStepChange])

  const handleNext = async () => {
    if (isSubmitting || isNavigating) return
    
    if (!isLastStep) {
      // For non-last steps: save and advance
      setIsNavigating(true)
      try {
        if (onNextStep) {
          const success = await onNextStep()
          if (success) {
            const nextStep = currentStepIndex + 1
            setCurrentStepIndex(nextStep)
            updateMaxStep(nextStep)
          }
        } else {
          // No save callback, just advance
          const nextStep = currentStepIndex + 1
          setCurrentStepIndex(nextStep)
          updateMaxStep(nextStep)
        }
      } finally {
        setIsNavigating(false)
      }
    } else {
      // Last step: publish/re-publish
      onComplete()
    }
  }

  const handleSave = async () => {
    if (isSubmitting || isNavigating || !onSave) return
    
    setIsNavigating(true)
    try {
      await onSave()
    } finally {
      setIsNavigating(false)
    }
  }

  const handleBack = () => {
    if (!isFirstStep && !isSubmitting && !isNavigating) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleStepClick = (stepIndex: number) => {
    if (isSubmitting || isNavigating) return
    
    // Check if step is accessible
    if (!isStepAccessible(stepIndex)) return
    
    setCurrentStepIndex(stepIndex)
  }

  const handleDashboardClick = () => {
    if (isSubmitting || isNavigating) return
    
    if (onCancel) {
      onCancel()
    } else {
      navigate('/')
    }
  }

  const handlePreviewClick = (type: 'pre-event' | 'post-event') => {
    if (onPreview) {
      onPreview(type)
    } else {
      console.log(`Preview ${type}`)
    }
  }

  // Determine step status for side nav
  const getStepStatus = (index: number): 'completed' | 'active' | 'locked' | 'available' => {
    if (index < currentStepIndex && hasEventId) return 'completed'
    if (index === currentStepIndex) return 'active'
    if (!isStepAccessible(index)) return 'locked'
    return 'available'
  }

  const renderSideNav = () => (
    <View
      width="size-3000"
      borderEndWidth="thin"
      borderEndColor="gray-300"
      UNSAFE_style={SIDE_NAV_STICKY_STYLES}
    >
    <View padding="size-100">
          {/* Dashboard Link */}
          <button
            onClick={handleDashboardClick}
            disabled={isSubmitting || isNavigating}
            style={{
              border: 'none',
              background: COLORS.TRANSPARENT,
              color: COLORS.GRAY_800,
              padding: '8px 12px',
              textAlign: 'left',
              cursor: (isSubmitting || isNavigating) ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 400,
              opacity: (isSubmitting || isNavigating) ? 0.5 : 1,
              transition: 'all 0.2s ease',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && !isNavigating) {
                e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.1)'
                e.currentTarget.style.color = COLORS.ADOBE_RED
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting && !isNavigating) {
                e.currentTarget.style.backgroundColor = COLORS.TRANSPARENT
                e.currentTarget.style.color = COLORS.GRAY_800
              }
            }}
            onMouseDown={(e) => {
              if (!isSubmitting && !isNavigating) {
                e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.2)'
              }
            }}
            onMouseUp={(e) => {
              if (!isSubmitting && !isNavigating) {
                e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.1)'
              }
            }}
          >
            <Flex direction="row" gap="size-100" alignItems="center">
              <ChevronLeft size="S" />
              <Text>Dashboard</Text>
            </Flex>
          </button>
    </View>

      <View padding="size-300" flex={1}>
        <Text UNSAFE_style={{ 
          fontSize: '12px',
          fontWeight: 500,
          color: COLORS.GRAY_700,
          letterSpacing: '0.5px',
          marginBottom: '16px',
          display: 'block'
        }}>
          EVENT DETAILS
        </Text>
        
        <Flex direction="column" gap="size-100">
          {/* Add Content Section */}
          <View>
            <button
              disabled
              style={{
                border: 'none',
                background: COLORS.TRANSPARENT,
                color: COLORS.GRAY_800,
                padding: '8px 12px',
                textAlign: 'left',
                cursor: 'default',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: 400,
                transition: 'all 0.2s ease',
                width: '100%',
                marginBottom: '8px'
              }}
            >
              <Flex direction="row" gap="size-100" alignItems="center">
                <Document size="S" />
                <Text>Add Content</Text>
              </Flex>
            </button>
            
            <Flex direction="column" gap="size-50">
              {steps.map((step, index) => {
                // Session management is shown under the SESSIONS section instead
                if (step.id === 'session-management') return null

                const status = getStepStatus(index)
                const isActive = status === 'active'
                const isLocked = status === 'locked'
                const isCompleted = status === 'completed'
                const isDisabled = isLocked || isSubmitting || isNavigating
                
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(index)}
                    disabled={isDisabled}
                    style={{
                      border: 'none',
                      background: isActive ? COLORS.ADOBE_RED : COLORS.TRANSPARENT,
                      color: isActive ? COLORS.WHITE : isLocked ? COLORS.GRAY_600 : COLORS.GRAY_800,
                      padding: '8px 12px',
                      paddingLeft: '32px',
                      textAlign: 'left',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: isActive ? 500 : 400,
                      opacity: isLocked ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      width: '100%',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !isDisabled) {
                        e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.1)'
                        e.currentTarget.style.color = COLORS.ADOBE_RED
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = COLORS.TRANSPARENT
                        e.currentTarget.style.color = isLocked ? COLORS.GRAY_600 : COLORS.GRAY_800
                      }
                    }}
                    onMouseDown={(e) => {
                      if (!isActive && !isDisabled) {
                        e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.2)'
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!isActive && !isDisabled) {
                        e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.1)'
                      }
                    }}
                  >
                    {/* Status indicator */}
                    <span style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isCompleted && (
                        <Checkmark 
                          size="XS" 
                          UNSAFE_style={{ color: 'var(--spectrum-global-color-green-600)' }} 
                        />
                      )}
                      {isLocked && (
                        <LockClosed 
                          size="XS" 
                          UNSAFE_style={{ color: COLORS.GRAY_600 }} 
                        />
                      )}
                    </span>
                    {step.title}
                  </button>
                )
              })}
            </Flex>
          </View>
        </Flex>
      </View>
      <View padding="size-300" flex={1}>
        <Text UNSAFE_style={{ 
          fontSize: '12px',
          fontWeight: 500,
          color: COLORS.GRAY_700,
          letterSpacing: '0.5px',
          marginBottom: '16px',
          display: 'block'
        }}>
          SESSIONS
        </Text>
        {(() => {
          const sessionStepIndex = steps.findIndex(s => s.id === 'session-management')
          if (sessionStepIndex === -1) return null
          const status = getStepStatus(sessionStepIndex)
          const isActive = status === 'active'
          const isLocked = status === 'locked'
          const isDisabled = isLocked || isSubmitting || isNavigating
          return (
            <button
              onClick={() => handleStepClick(sessionStepIndex)}
              disabled={isDisabled}
              style={{
                border: 'none',
                background: isActive ? COLORS.ADOBE_RED : COLORS.TRANSPARENT,
                color: isActive ? COLORS.WHITE : isLocked ? COLORS.GRAY_600 : COLORS.GRAY_800,
                padding: '8px 12px',
                textAlign: 'left',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
                fontWeight: isActive ? 500 : 400,
                opacity: isLocked ? 0.6 : 1,
                transition: 'all 0.2s ease',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (!isActive && !isDisabled) {
                  e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.1)'
                  e.currentTarget.style.color = COLORS.ADOBE_RED
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = COLORS.TRANSPARENT
                  e.currentTarget.style.color = isLocked ? COLORS.GRAY_600 : COLORS.GRAY_800
                }
              }}
              onMouseDown={(e) => {
                if (!isActive && !isDisabled) {
                  e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.2)'
                }
              }}
              onMouseUp={(e) => {
                if (!isActive && !isDisabled) {
                  e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.1)'
                }
              }}
            >
              Session Management
            </button>
          )
        })()}
      </View>

      {/* Progress indicator at bottom */}
      <View padding="size-300">
        <Flex direction="column" gap="size-100">
          <Flex justifyContent="space-between">
            <Text UNSAFE_style={{ fontSize: '12px' }}>
              Step {currentStepIndex + 1} of {steps.length}
            </Text>
            <Text UNSAFE_style={{ fontSize: '12px' }}>{Math.round(progress)}%</Text>
          </Flex>
          <ProgressBar
            label="Progress"
            value={progress}
            showValueLabel={false}
            size="S"
          />
          {!hasEventId && currentStepIndex === 0 && (
            <Text UNSAFE_style={{ 
              fontSize: '11px', 
              color: COLORS.GRAY_600,
              fontStyle: 'italic',
              marginTop: '4px'
            }}>
              Save to unlock other steps
            </Text>
          )}
        </Flex>
      </View>
    </View>
  )

  const renderActionBar = () => {
    const getNextButtonText = () => {
      if (isSubmitting) {
        return isLastStep ? 'Publishing...' : 'Saving...'
      }
      if (isNavigating) {
        return 'Saving...'
      }
      if (isLastStep) {
        return isPublished ? 'Re-publish event' : 'Publish event'
      }
      return 'Next step'
    }

    const isActionDisabled = currentStep.isValid === false || isSubmitting || isNavigating

    return (
      <View
        UNSAFE_style={{
          ...FIXED_ACTION_BAR_STYLES,
          backgroundColor: COLORS.ADOBE_RED,
        }}
      >
        <Flex
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          height="100%"
          marginStart="size-400"
          marginEnd="size-400"
        >
          {/* Left: Back button */}
          <View>
            <Button
              variant="secondary"
              style="outline"
              staticColor="white"
              onPress={handleBack}
              isDisabled={isFirstStep || isSubmitting || isNavigating}
            >
              <ChevronLeft />
            </Button>
          </View>

          {/* Right: Action buttons */}
          <Flex direction="row" alignItems="center">
            {/* Preview buttons - only show if event has been saved */}
            {hasEventId && (
              <Flex direction="row" gap="size-100" alignItems="center">
                <Button
                  variant="secondary"
                  style="fill"
                  onPress={() => handlePreviewClick('pre-event')}
                  isDisabled={isSubmitting || isNavigating}
                >
                  <WebPage size="S" />
                  <Text>Pre-event</Text>
                </Button>
                <Button
                  variant="secondary"
                  style="fill"
                  onPress={() => handlePreviewClick('post-event')}
                  isDisabled={isSubmitting || isNavigating}
                >
                  <WebPage size="S" />
                  <Text>Post-event</Text>
                </Button>
              </Flex>
            )}

            {/* Vertical Divider */}
            {hasEventId && (
              <View
                UNSAFE_style={{
                  width: '1px',
                  height: '32px',
                  backgroundColor: COLORS.WHITE,
                  opacity: 0.3,
                  marginLeft: '80px',
                  marginRight: '80px'
                }}
              />
            )}

            {/* Save and Next buttons */}
            <Flex direction="row" gap="size-100" alignItems="center">
              <Button
                variant="secondary"
                style="outline"
                staticColor="white"
                onPress={handleSave}
                isDisabled={isActionDisabled || !onSave}
              >
                Save
              </Button>
              <Button
                variant="primary"
                style="fill"
                staticColor="black"
                onPress={handleNext}
                isDisabled={isActionDisabled}
              >
                <Flex direction="row-reverse" gap="size-50" alignItems="center">
                  <Text>{getNextButtonText()}</Text>
                  <ChevronRight size="S" />
                </Flex>
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </View>
    )
  }

  // Determine the display status - use provided status, or derive from isPublished
  const displayStatus = eventStatus || (isPublished ? 'published' : 'draft')
  
  // Status badge styling based on status
  const getStatusBadgeStyles = (status: string): { dotColor: string; textColor: string; bgColor: string; borderColor: string } => {
    const statusStyles: Record<string, { dotColor: string; textColor: string; bgColor: string; borderColor: string }> = {
      draft: {
        dotColor: COLORS.STATUS_DRAFT,
        textColor: COLORS.GRAY_800,
        bgColor: COLORS.WHITE,
        borderColor: COLORS.GRAY_300
      },
      published: {
        dotColor: COLORS.STATUS_PUBLISHED,
        textColor: COLORS.GRAY_800,
        bgColor: COLORS.WHITE,
        borderColor: COLORS.GRAY_300
      },
      archived: {
        dotColor: COLORS.STATUS_ARCHIVED,
        textColor: COLORS.GRAY_700,
        bgColor: COLORS.WHITE,
        borderColor: COLORS.GRAY_300
      },
      cancelled: {
        dotColor: COLORS.STATUS_CANCELLED,
        textColor: COLORS.GRAY_800,
        bgColor: COLORS.WHITE,
        borderColor: COLORS.GRAY_300
      }
    }
    return statusStyles[status.toLowerCase()] || statusStyles.draft
  }
  
  const statusStyles = getStatusBadgeStyles(displayStatus)
  const statusLabel = displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1).toLowerCase()

  const mainContent = (
    <View>
      {/* Step title */}
      <View marginBottom="size-300">
        {/* Event type label */}
        {eventTypeLabel && (
          <Text 
            UNSAFE_style={{ 
              fontSize: '14px',
              fontWeight: 500,
              color: COLORS.GRAY_700,
              marginBottom: '8px',
              display: 'block'
            }}
          >
            {eventTypeLabel}
          </Text>
        )}
        
        {/* Heading row with status badge */}
        <Flex direction="row" alignItems="center" gap="size-400">
          <Heading level={2} UNSAFE_style={TYPOGRAPHY.STEP_HEADING}>{currentStep.title}</Heading>
          
          {/* Status badge */}
          <View
            UNSAFE_style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 8px',
              borderRadius: '4px',
              backgroundColor: statusStyles.bgColor,
              flexShrink: 0
            }}
          >
            {/* Status dot */}
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: statusStyles.dotColor,
                flexShrink: 0
              }}
            />
            <Text
              UNSAFE_style={{
                fontSize: '14px',
                fontWeight: 500,
                color: statusStyles.textColor
              }}
            >
              {statusLabel}
            </Text>
          </View>
        </Flex>
      </View>

      {/* Step content */}
      <View marginTop="size-300" marginBottom="size-400">{currentStep.component}</View>
    </View>
  )

  if (showSideNav) {
    return (
      <>
        <Flex direction="row" gap="size-0">
          {renderSideNav()}
          <View UNSAFE_style={SCROLLABLE_CONTENT_STYLES} flex={1} padding="size-400">
            {mainContent}
          </View>
        </Flex>
        {renderActionBar()}
      </>
    )
  }

  return (
    <>
      <View UNSAFE_style={SCROLLABLE_CONTENT_STYLES}>{mainContent}</View>
      {renderActionBar()}
    </>
  )
}
