/* 
* <license header>
*/

import React, { useState } from 'react'
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
import { 
  SIDE_NAV_STICKY_STYLES, 
  SCROLLABLE_CONTENT_STYLES, 
  FIXED_ACTION_BAR_STYLES,
  COLORS
} from '../../styles/designSystem'

export interface WizardStep {
  id: string
  title: string
  description?: string
  component: React.ReactNode
  isValid?: boolean
}

interface FormWizardProps {
  steps: WizardStep[]
  onComplete: () => void
  onCancel?: () => void
  isSubmitting?: boolean
  showSideNav?: boolean
}

export const FormWizard: React.FC<FormWizardProps> = ({
  steps,
  onComplete,
  onCancel,
  isSubmitting = false,
  showSideNav = false
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const navigate = useNavigate()

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStepIndex(currentStepIndex + 1)
    } else {
      onComplete()
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleStepClick = (stepIndex: number) => {
    // For now, allow navigation to any step (we'll add locking later)
    setCurrentStepIndex(stepIndex)
  }

  const handleDashboardClick = () => {
    if (onCancel) {
      onCancel()
    } else {
      navigate('/')
    }
  }

  const renderSideNav = () => (
    <View
      width="size-3000"
      borderEndWidth="thin"
      borderEndColor="gray-300"
      UNSAFE_style={SIDE_NAV_STICKY_STYLES}
    >
      <View padding="size-300" flex={1}>
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
        
        <Flex direction="column" gap="size-100">
          {/* Dashboard Link */}
          <button
            onClick={handleDashboardClick}
            disabled={isSubmitting}
            style={{
              border: 'none',
              background: COLORS.TRANSPARENT,
              color: COLORS.GRAY_800,
              padding: '8px 12px',
              textAlign: 'left',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 400,
              opacity: isSubmitting ? 0.5 : 1,
              transition: 'all 0.2s ease',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.1)'
                e.currentTarget.style.color = COLORS.ADOBE_RED
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = COLORS.TRANSPARENT
                e.currentTarget.style.color = COLORS.GRAY_800
              }
            }}
            onMouseDown={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.2)'
              }
            }}
            onMouseUp={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.1)'
              }
            }}
          >
            <Flex direction="row" gap="size-100" alignItems="center">
              <ChevronLeft size="S" />
              <Text>Dashboard</Text>
            </Flex>
          </button>

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
                const isActive = currentStepIndex === index
                const isDisabled = false // For now, all enabled
                
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(index)}
                    disabled={isDisabled || isSubmitting}
                    style={{
                      border: 'none',
                      background: isActive ? COLORS.ADOBE_RED : COLORS.TRANSPARENT,
                      color: isActive ? COLORS.WHITE : COLORS.GRAY_800,
                      padding: '8px 12px',
                      paddingLeft: '38px', // Align with icon buttons (12px base + 18px icon + 8px gap)
                      textAlign: 'left',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: isActive ? 500 : 400,
                      opacity: isDisabled ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !isDisabled) {
                        e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.1)' // Light red background
                        e.currentTarget.style.color = COLORS.ADOBE_RED
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = COLORS.TRANSPARENT
                        e.currentTarget.style.color = COLORS.GRAY_800
                      }
                    }}
                    onMouseDown={(e) => {
                      if (!isActive && !isDisabled) {
                        e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.2)' // Darker red background
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!isActive && !isDisabled) {
                        e.currentTarget.style.backgroundColor = 'rgba(235, 16, 0, 0.1)'
                      }
                    }}
                  >
                    {step.title}
                  </button>
                )
              })}
            </Flex>
          </View>
        </Flex>
      </View>

      {/* Progress indicator at bottom */}
      <View 
        padding="size-300" 
      >
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
        </Flex>
      </View>
    </View>
  )

  const renderActionBar = () => {
    const getNextButtonText = () => {
      if (isSubmitting) return 'Publishing...'
      if (isLastStep) return 'Publish event'
      return 'Next step'
    }

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
              isDisabled={isFirstStep || isSubmitting}
            >
              <ChevronLeft />
            </Button>
          </View>

          {/* Right: Action buttons */}
          <Flex direction="row" alignItems="center">
            {/* Preview buttons */}
            <Flex direction="row" gap="size-100" alignItems="center">
              <Button
                variant="secondary"
                style="fill"
                onPress={() => {
                  // TODO: Implement pre-event preview
                  console.log('Preview pre-event')
                }}
                isDisabled={isSubmitting}
              >
                <WebPage size="S" />
                <Text>Pre-event</Text>
              </Button>
              <Button
                variant="secondary"
                style="fill"
                onPress={() => {
                  // TODO: Implement post-event preview
                  console.log('Preview post-event')
                }}
                isDisabled={isSubmitting}
              >
                <WebPage size="S" />
                <Text>Post-event</Text>
              </Button>
            </Flex>

            {/* Vertical Divider */}
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

            {/* Save and Next buttons */}
            <Flex direction="row" gap="size-100" alignItems="center">
              <Button
                variant="secondary"
                style="outline"
                staticColor="white"
                onPress={() => {
                  // TODO: Implement save functionality
                  console.log('Save draft')
                }}
                isDisabled={isSubmitting}
              >
                Save
              </Button>
              <Button
                variant="primary"
                style="fill"
                staticColor="black"
                onPress={handleNext}
                isDisabled={currentStep.isValid === false || isSubmitting}
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

  const mainContent = (
    <View>
      {/* Step title and description */}
      <View marginBottom="size-300">
        <Heading level={2}>{currentStep.title}</Heading>
        {currentStep.description && (
          <Text marginTop="size-100">{currentStep.description}</Text>
        )}
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

