/* 
* <license header>
*/

import React from 'react'
import {
  Flex,
  TextField,
  Picker,
  Item,
  Text,
} from '@adobe/react-spectrum'
import { HeadingWithTooltip } from '../../components/shared'
import { TYPOGRAPHY, FLEX_GAP } from '../../styles/designSystem'
import { useEventFormComponent } from '../../hooks/useEventFormComponent'
import { MarketoIntegrationData } from '../../types/domain'
import { MARKETO_OPTIONS } from '../../config/uiConstants'

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * MarketoIntegrationComponent - Manages Marketo integration settings for events
 * 
 * Exclusivity rules:
 * - Only visible for ExperienceCloud events (not CreativeCloud)
 * - All fields are locked once the event is created (eventId exists)
 * 
 * Features:
 * - Event type selection (DX regions or no integration)
 * - Salesforce Campaign ID
 * - MCZ Program Name
 * - Co-marketing Partner
 * - Event POI (Product of Interest)
 * 
 * When "No Marketo integration" is selected, all other fields are disabled.
 * When the event is created (has eventId), ALL fields become locked/read-only.
 */
export const MarketoIntegrationComponent: React.FC = () => {
  // ============================================================================
  // CONTEXT INTEGRATION
  // ============================================================================
  
  const {
    formData,
    updateFormData,
    eventId,
  } = useEventFormComponent({
    componentId: 'marketo-integration',
  })
  
  // ============================================================================
  // CLOUD TYPE EXCLUSIVITY
  // ============================================================================
  
  // Marketo integration is only for ExperienceCloud events (DX = Digital Experience)
  // Do not render for CreativeCloud events
  if (formData.cloudType !== 'ExperienceCloud') {
    return null
  }
  
  // ============================================================================
  // STATE DERIVATION
  // ============================================================================
  
  const marketoIntegration = formData.marketoIntegration || {}
  const eventType = marketoIntegration.eventType || ''
  
  // Determine if fields should be disabled
  const isNoIntegration = !eventType || eventType === 'no-integration'
  
  // Once the event is created (eventId exists), ALL fields are locked
  // This matches v1 behavior where Marketo integration is immutable after creation
  const isLocked = !!eventId
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const updateMarketoField = (field: keyof MarketoIntegrationData, value: string) => {
    const updated = { ...marketoIntegration, [field]: value }
    updateFormData({ marketoIntegration: updated })
  }
  
  const handleEventTypeChange = (key: React.Key) => {
    const value = String(key)
    
    if (value === 'no-integration') {
      // Clear all marketo integration data
      updateFormData({ marketoIntegration: undefined })
    } else {
      // Set event type and keep other fields
      updateMarketoField('eventType', value)
    }
  }
  
  const handlePoiChange = (key: React.Key) => {
    const value = String(key)
    if (value === 'no-poi') {
      // Remove eventPoi from the integration data
      const { eventPoi, ...rest } = marketoIntegration
      updateFormData({ marketoIntegration: Object.keys(rest).length > 0 ? rest : undefined })
    } else {
      updateMarketoField('eventPoi', value)
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Flex direction="column" gap={FLEX_GAP.SECTION}>
      {/* Header */}
      <Flex direction="column" gap={FLEX_GAP.TIGHT}>
        <HeadingWithTooltip
          level={3}
          tooltip="Configure Marketo integration for lead tracking and marketing automation. Select your region and provide campaign details."
        >
          Marketo integration
        </HeadingWithTooltip>
        <Text UNSAFE_style={TYPOGRAPHY.SECTION_DESCRIPTION}>
          Set up Marketo integration for your event to enable lead capture and marketing automation.
          {isLocked && ' All fields are locked after the event is created.'}
        </Text>
      </Flex>

      {/* Event Type Selector */}
      <Picker
        label="Event type"
        isRequired
        selectedKey={eventType || 'no-integration'}
        onSelectionChange={handleEventTypeChange}
        isDisabled={isLocked}
        width="size-3600"
      >
        {MARKETO_OPTIONS.eventTypes.map((option) => (
          <Item key={option.key}>{option.label}</Item>
        ))}
      </Picker>

      {/* Two-column layout for main fields */}
      <Flex direction="row" gap="size-400" wrap>
        <TextField
          label="Salesforce campaign ID"
          isRequired={!isNoIntegration && !isLocked}
          value={marketoIntegration.salesforceCampaignId || ''}
          onChange={(value) => updateMarketoField('salesforceCampaignId', value)}
          placeholder="Add Salesforce campaign ID"
          isDisabled={isNoIntegration || isLocked}
          width="size-3600"
        />

        <TextField
          label="MCZ program name"
          isRequired={!isNoIntegration && !isLocked}
          value={marketoIntegration.mczProgramName || ''}
          onChange={(value) => updateMarketoField('mczProgramName', value)}
          placeholder="Add MCZ program name"
          isDisabled={isNoIntegration || isLocked}
          width="size-3600"
        />
      </Flex>

      {/* Second row */}
      <Flex direction="row" gap="size-400" wrap>
        <TextField
          label="Co-marketing partner"
          value={marketoIntegration.coMarketingPartner || ''}
          onChange={(value) => updateMarketoField('coMarketingPartner', value)}
          placeholder="Add co-marketing partner name"
          isDisabled={isNoIntegration || isLocked}
          width="size-3600"
        />

        <Picker
          label="Event POI"
          selectedKey={marketoIntegration.eventPoi || 'no-poi'}
          onSelectionChange={handlePoiChange}
          isDisabled={isNoIntegration || isLocked}
          width="size-3600"
        >
          {MARKETO_OPTIONS.eventPois.map((option) => (
            <Item key={option.key}>{option.label}</Item>
          ))}
        </Picker>
      </Flex>
    </Flex>
  )
}

