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
}

export const FormWizard: React.FC<FormWizardProps> = ({
  steps,
  onComplete,
  onCancel,
  isSubmitting = false
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

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

  return (
    <View>
      {/* Progress indicator */}
      <View marginBottom="size-300">
        <Flex direction="column" gap="size-100">
          <Flex justifyContent="space-between">
            <Text>
              Step {currentStepIndex + 1} of {steps.length}
            </Text>
            <Text>{Math.round(progress)}% Complete</Text>
          </Flex>
          <ProgressBar
            label="Progress"
            value={progress}
            showValueLabel={false}
          />
        </Flex>
      </View>

      {/* Step title and description */}
      <View marginBottom="size-300">
        <Heading level={2}>{currentStep.title}</Heading>
        {currentStep.description && (
          <Text marginTop="size-100">{currentStep.description}</Text>
        )}
      </View>

      {/* Step content */}
      <View marginTop="size-300" marginBottom="size-400">{currentStep.component}</View>

      {/* Navigation buttons */}
      <Flex justifyContent="space-between">
        <ButtonGroup>
          {!isFirstStep && (
            <Button variant="secondary" onPress={handleBack} isDisabled={isSubmitting}>
              Back
            </Button>
          )}
          {onCancel && (
            <Button variant="secondary" onPress={onCancel} isDisabled={isSubmitting}>
              Cancel
            </Button>
          )}
        </ButtonGroup>
        <Button
          variant="accent"
          onPress={handleNext}
          isDisabled={currentStep.isValid === false || isSubmitting}
        >
          {isLastStep ? 'Submit' : 'Next'}
        </Button>
      </Flex>
    </View>
  )
}

