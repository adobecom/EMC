/*
* <license header>
*/

import React, { useState, useCallback } from 'react'
import { Button, Text, ProgressBar, Heading } from '@react-spectrum/s2'
import { style, iconStyle } from '@react-spectrum/s2/style' with { type: 'macro' }
import { useNavigate } from 'react-router-dom'
import ChevronLeft from '@react-spectrum/s2/icons/ChevronLeft'
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight'
import RocketQuickActions from '@react-spectrum/s2/icons/RocketQuickActions'
import WebPage from '@react-spectrum/s2/icons/WebPage'
import FileText from '@react-spectrum/s2/icons/FileText'
import {
  LAYOUT_DIMENSIONS,
  FORM_WIZARD_FOOTER_STYLES,
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
  /** Called when Publish / Re-publish is clicked */
  onComplete: () => Promise<void> | void
  /** Called when Save button is clicked - should save without advancing */
  onSave?: () => Promise<boolean> | boolean
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
  /** Optional actions to render in the header (e.g., history button) */
  headerActions?: React.ReactNode
}

/** Side nav: Dashboard row hover */
const SIDE_NAV_HOVER_BG = 'var(--spectrum-global-color-gray-200)'

/** Step row: 2px left pipe (active / hover); label inset always reserves this gutter */
const SIDE_NAV_PIPE_WIDTH = 2
const SIDE_NAV_PIPE_GAP = 14
const SIDE_NAV_PIPE_LEFT = 12
const SIDE_NAV_STEP_LABEL_INSET =
  SIDE_NAV_PIPE_LEFT + SIDE_NAV_PIPE_WIDTH + SIDE_NAV_PIPE_GAP
const SIDE_NAV_PIPE_HOVER = 'var(--spectrum-global-color-gray-400)'
const SIDE_NAV_PIPE_ACTIVE = '#000000'

export const FormWizard: React.FC<FormWizardProps> = ({
  steps,
  onComplete,
  onSave,
  onCancel,
  onPreview,
  isSubmitting = false,
  showSideNav = false,
  hasEventId = false,
  isPublished = false,
  maxStepReached = 0,
  onMaxStepChange,
  eventTypeLabel,
  eventStatus,
  headerActions
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isNavigating, setIsNavigating] = useState(false)
  const [pendingAction, setPendingAction] = useState<'save' | 'publish' | 'next' | null>(null)
  const [sideNavStepHoverIndex, setSideNavStepHoverIndex] = useState<number | null>(null)
  const navigate = useNavigate()

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  // Determine if a step is accessible
  const isStepAccessible = useCallback((stepIndex: number): boolean => {
    if (stepIndex === 0) return true
    return hasEventId && stepIndex <= maxStepReached
  }, [hasEventId, maxStepReached])

  const handlePublish = async () => {
    if (isSubmitting || isNavigating || currentStep.isValid === false) return
    setPendingAction('publish')
    try {
      await Promise.resolve(onComplete())
    } finally {
      setPendingAction(null)
    }
  }

  const runSave = useCallback(
    async (action: 'save' | 'next') => {
      if (isSubmitting || isNavigating || !onSave) return

      setPendingAction(action)
      setIsNavigating(true)
      try {
        const result = await onSave()
        const ok = result !== false
        if (ok && onMaxStepChange) {
          const capped = steps.length - 1
          const nextMax = Math.min(capped, Math.max(maxStepReached, currentStepIndex + 1))
          if (nextMax > maxStepReached) {
            onMaxStepChange(nextMax)
          }
        }
        if (ok && action === 'next') {
          setCurrentStepIndex((i) => (i < steps.length - 1 ? i + 1 : i))
        }
      } finally {
        setIsNavigating(false)
        setPendingAction(null)
      }
    },
    [
      isSubmitting,
      isNavigating,
      onSave,
      onMaxStepChange,
      maxStepReached,
      currentStepIndex,
      steps.length
    ]
  )

  const handleSave = useCallback(() => {
    void runSave('save')
  }, [runSave])

  const handleNext = useCallback(() => {
    void runSave('next')
  }, [runSave])

  const handleBack = () => {
    if (!isFirstStep && !isSubmitting && !isNavigating) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleStepClick = (stepIndex: number) => {
    if (isSubmitting || isNavigating) return
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
    }
  }

  const getStepStatus = (index: number): 'active' | 'locked' | 'available' => {
    if (index === currentStepIndex) return 'active'
    if (!isStepAccessible(index)) return 'locked'
    return 'available'
  }

  const renderSideNav = () => (
    <div
      style={{
        width: LAYOUT_DIMENSIONS.SIDE_NAV_WIDTH,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        backgroundColor: COLORS.GRAY_100,
      }}
    >
      <div data-testid="wizard-side-nav" style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
        <Text UNSAFE_style={{
          fontSize: '12px',
          fontWeight: 500,
          color: COLORS.GRAY_700,
          letterSpacing: '0.5px',
          marginBottom: '16px',
          display: 'block'
        }}>
          EVENT CREATION
        </Text>

        <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
          <button
            type="button"
            data-testid="wizard-dashboard-button"
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
              transition: 'background-color 0.15s ease',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && !isNavigating) {
                e.currentTarget.style.backgroundColor = SIDE_NAV_HOVER_BG
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.TRANSPARENT
            }}
          >
            <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
              <ChevronLeft styles={iconStyle({ color: 'gray'})} aria-hidden />
              <Text>Dashboard</Text>
            </div>
          </button>

          <div>
            <button
              type="button"
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
                width: '100%',
                marginBottom: '8px'
              }}
            >
              <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
                <FileText styles={iconStyle({ color: 'gray'})} aria-hidden />
                <Text>Add Content</Text>
              </div>
            </button>

            <div className={style({ display: 'flex', flexDirection: 'column', gap: 4 })}>
              {steps.map((step, index) => {
                const status = getStepStatus(index)
                const isActive = status === 'active'
                const isLocked = status === 'locked'
                const isDisabled = isLocked || isSubmitting || isNavigating
                const showPipe =
                  isActive || (!isDisabled && sideNavStepHoverIndex === index)
                const pipeColor = isActive ? SIDE_NAV_PIPE_ACTIVE : SIDE_NAV_PIPE_HOVER

                return (
                  <button
                    type="button"
                    key={step.id}
                    data-testid={`wizard-step-${step.id}`}
                    onClick={() => handleStepClick(index)}
                    disabled={isDisabled}
                    style={{
                      border: 'none',
                      background: COLORS.TRANSPARENT,
                      color: isLocked ? COLORS.GRAY_600 : isActive ? COLORS.BLACK : COLORS.GRAY_800,
                      padding: '8px 12px',
                      paddingLeft: SIDE_NAV_PIPE_LEFT,
                      textAlign: 'left',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: isActive ? 700 : 400,
                      opacity: isLocked ? 0.55 : 1,
                      fontStyle: 'normal',
                      width: '100%',
                      position: 'relative',
                      gap: 8,
                    }}
                    onMouseEnter={() => {
                      if (!isDisabled) setSideNavStepHoverIndex(index)
                    }}
                    onMouseLeave={() => {
                      setSideNavStepHoverIndex((prev) => (prev === index ? null : prev))
                    }}
                  >
                    {showPipe && (
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute',
                          left: SIDE_NAV_PIPE_LEFT,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: SIDE_NAV_PIPE_WIDTH,
                          height: '1em',
                          backgroundColor: pipeColor,
                          borderRadius: 0,
                        }}
                      />
                    )}
                    <span
                      style={{
                        display: 'block',
                        paddingLeft: SIDE_NAV_STEP_LABEL_INSET,
                      }}
                    >
                      <Text>{step.title}</Text>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 24px 85px 24px', flexShrink: 0 }}>
        <div className={style({ display: 'flex', flexDirection: 'column', gap: 8 })}>
          <Text UNSAFE_style={{ fontSize: '12px' }}>
            Step {currentStepIndex + 1} of {steps.length}
          </Text>
          <ProgressBar
            data-testid="wizard-progress"
            label="Progress"
            value={progress}
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
        </div>
      </div>
    </div>
  )

  const getPublishLabel = () => {
    if (pendingAction === 'publish') {
      return isPublished ? 'Re-publishing...' : 'Publishing...'
    }
    return isPublished ? 'Re-publish event' : 'Publish event'
  }

  const isActionDisabled = currentStep.isValid === false || isSubmitting || isNavigating
  const isLastStep = currentStepIndex >= steps.length - 1
  const saveLabel = pendingAction === 'save' ? 'Saving...' : 'Save'
  const nextLabel = pendingAction === 'next' ? 'Saving...' : 'Next'

  const actionBarRowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minWidth: 0,
    flex: 1,
    boxSizing: 'border-box',
    marginInlineStart: 'var(--spectrum-global-dimension-size-400)',
    marginInlineEnd: 'var(--spectrum-global-dimension-size-400)',
  }

  const renderActionBar = () => (
    <div style={FORM_WIZARD_FOOTER_STYLES}>
      <div style={actionBarRowStyle}>
        <div style={{ flexShrink: 0 }}>
          <Button
            data-testid="wizard-back-button"
            variant="secondary"
            fillStyle="outline"
            staticColor="white"
            onPress={handleBack}
            isDisabled={isFirstStep || isSubmitting || isNavigating}
          >
            <ChevronLeft />
          </Button>
        </div>

        <div
          className={style({ display: 'flex', alignItems: 'center' })}
          style={{
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: 'var(--spectrum-global-dimension-size-200)',
            minWidth: 0,
            flexShrink: 1,
          }}
        >
          {hasEventId && (
            <>
              <div
                className={style({ display: 'flex', gap: 8, alignItems: 'center' })}
                style={{ flexWrap: 'wrap' }}
              >
                <Button
                  data-testid="wizard-preview-pre"
                  variant="secondary"
                  fillStyle="fill"
                  staticColor="white"
                  onPress={() => handlePreviewClick('pre-event')}
                  isDisabled={isSubmitting || isNavigating}
                >
                  <WebPage />
                  <Text>Pre-event</Text>
                </Button>
                <Button
                  data-testid="wizard-preview-post"
                  variant="secondary"
                  fillStyle="fill"
                  staticColor="white"
                  onPress={() => handlePreviewClick('post-event')}
                  isDisabled={isSubmitting || isNavigating}
                >
                  <WebPage />
                  <Text>Post-event</Text>
                </Button>
              </div>
              <div
                style={{
                  width: 1,
                  height: 32,
                  backgroundColor: COLORS.WHITE,
                  opacity: 0.3,
                  flexShrink: 0,
                }}
                aria-hidden
              />
            </>
          )}

          <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
            <Button
              data-testid="wizard-publish-button"
              variant="accent"
              fillStyle="fill"
              onPress={handlePublish}
              isDisabled={isActionDisabled || pendingAction === 'publish'}
            >
              <Text>{getPublishLabel()}</Text>
              <RocketQuickActions aria-hidden />
            </Button>
            <Button
              data-testid="wizard-save-button"
              variant="secondary"
              fillStyle="outline"
              staticColor="white"
              onPress={handleSave}
              isDisabled={isActionDisabled || !onSave}
            >
              {saveLabel}
            </Button>
            {!isLastStep && (
              <Button
                data-testid="wizard-next-button"
                variant="accent"
                fillStyle="fill"
                onPress={handleNext}
                isDisabled={isActionDisabled || !onSave || pendingAction === 'next'}
              >
                <Text>{nextLabel}</Text>
                <ChevronRight aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const displayStatus = eventStatus || (isPublished ? 'published' : 'draft')

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
    <div>
      <div style={{ marginBottom: 24 }}>
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

        <div className={style({ display: 'flex', alignItems: 'center', gap: 32 })}>
          <Heading data-testid="wizard-step-heading" level={2} UNSAFE_style={TYPOGRAPHY.STEP_HEADING}>{currentStep.title}</Heading>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 8px',
              borderRadius: 4,
              backgroundColor: statusStyles.bgColor,
              flexShrink: 0,
            }}
          >
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
              data-testid="wizard-status-badge"
              UNSAFE_style={{
                fontSize: '14px',
                fontWeight: 500,
                color: statusStyles.textColor
              }}
            >
              {statusLabel}
            </Text>
          </div>

          {headerActions ? <div style={{ flex: 1 }} /> : null}
          {headerActions}
        </div>
      </div>

      <div style={{ marginTop: 24, marginBottom: 32 }}>{currentStep.component}</div>
    </div>
  )

  const shellStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    height: '100%',
    width: '100%',
    alignSelf: 'stretch',
  }

  const bodyRowStyle: React.CSSProperties = {
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  }

  const mainColumnStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    padding: 32,
  }

  if (showSideNav) {
    return (
      <div data-testid="form-wizard" style={shellStyle}>
        <div style={bodyRowStyle}>
          {renderSideNav()}
          <div style={mainColumnStyle}>
            {mainContent}
          </div>
        </div>
        {renderActionBar()}
      </div>
    )
  }

  return (
    <div data-testid="form-wizard" style={shellStyle}>
      <div style={{ ...bodyRowStyle, flexDirection: 'column' }}>
        <div style={{ ...mainColumnStyle, flex: 1 }}>{mainContent}</div>
      </div>
      {renderActionBar()}
    </div>
  )
}
