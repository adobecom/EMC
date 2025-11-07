/* 
* <license header>
*/

import React, { useState } from 'react'
import {
  View,
  Flex,
  Button,
  ButtonGroup,
  ProgressBar,
  Heading,
  Text
} from '@adobe/react-spectrum'
import { useNavigate } from 'react-router-dom'

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
      UNSAFE_style={{
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 160px)', // viewport height minus action bar (60px)
        minHeight: 'calc(100vh - 160px)'
      }}
    >
      <View padding="size-300" flex={1}>
        <Heading level={4} marginBottom="size-300" UNSAFE_style={{ 
          textTransform: 'uppercase', 
          fontSize: '12px', 
          fontWeight: 600,
          color: 'var(--spectrum-global-color-gray-700)',
          letterSpacing: '0.5px'
        }}>
          Event Creation
        </Heading>
        
        <Flex direction="column" gap="size-100">
          {/* Dashboard Link */}
          <Button
            variant="primary"
            staticColor="black"
            style="outline"
            onPress={handleDashboardClick}
            isDisabled={isSubmitting}
            UNSAFE_style={{
              justifyContent: 'flex-start',
              width: '100%',
              marginBottom: '8px'
            }}
          >
            ← Dashboard
          </Button>

          {/* Add Content Section */}
          <View marginTop="size-100">
            <Text UNSAFE_style={{ 
              fontSize: '14px', 
              fontWeight: 600,
              marginBottom: '8px',
              display: 'block'
            }}>
              📝 Add Content
            </Text>
            
            <Flex direction="column" gap="size-50" marginStart="size-200">
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
                      background: isActive ? 'var(--spectrum-global-color-blue-400)' : 'transparent',
                      color: isActive ? 'white' : 'var(--spectrum-global-color-gray-800)',
                      padding: '8px 12px',
                      textAlign: 'left',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 400,
                      opacity: isDisabled ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !isDisabled) {
                        e.currentTarget.style.backgroundColor = 'var(--spectrum-global-color-gray-200)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent'
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

  const renderActionBar = () => (
    <View
      UNSAFE_style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: '#EB1000',
        zIndex: 100,
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.15)'
      }}
    >
      <Flex
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        height="100%"
        marginStart="size-3000"
        marginEnd="size-400"
      >
        <ButtonGroup>
          {!isFirstStep && (
            <Button
              variant="secondary"
              onPress={handleBack}
              isDisabled={isSubmitting}
              UNSAFE_style={{
                backgroundColor: 'white',
                color: '#EB1000'
              }}
            >
              Back
            </Button>
          )}
          {onCancel && !showSideNav && (
            <Button
              variant="secondary"
              onPress={onCancel}
              isDisabled={isSubmitting}
              UNSAFE_style={{
                backgroundColor: 'white',
                color: '#EB1000'
              }}
            >
              Cancel
            </Button>
          )}
        </ButtonGroup>

        <Flex direction="row" gap="size-200" alignItems="center">
          <Button
            variant="secondary"
            onPress={() => {
              // TODO: Implement preview functionality
              console.log('Preview event')
            }}
            isDisabled={isSubmitting}
            UNSAFE_style={{
              backgroundColor: 'white',
              color: '#EB1000'
            }}
          >
            Preview
          </Button>
          <Button
            variant="accent"
            onPress={handleNext}
            isDisabled={currentStep.isValid === false || isSubmitting}
            UNSAFE_style={{
              backgroundColor: 'white',
              color: '#EB1000',
              fontWeight: 600
            }}
          >
            {isLastStep ? 'Submit' : 'Next'}
          </Button>
        </Flex>
      </Flex>
    </View>
  )

  const mainContent = (
    <View UNSAFE_style={{ paddingBottom: '80px' }}>
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
          <View flex={1} padding="size-400">
            {mainContent}
          </View>
        </Flex>
        {renderActionBar()}
      </>
    )
  }

  return (
    <>
      <View>{mainContent}</View>
      {renderActionBar()}
    </>
  )
}

