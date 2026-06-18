/*
* <license header>
*/

import React, { useState, useCallback } from 'react'
import { Button, ButtonGroup, Content, Dialog, DialogTrigger, Heading, Picker, PickerItem, Text, TextField } from '@react-spectrum/s2'
import { EventDashboardItem, MarketoIntegrationData } from '../../types/domain'
import { EVENT_TYPE_OPTIONS, EVENT_POI_OPTIONS } from '../EventForm/MarketoIntegrationComponent'
import { apiService, cachedApi } from '../../services/api'
import { filterEventData } from '../../utils/dataFilters'
import { useToast } from '../../contexts'

// ============================================================================
// CONSTANTS
// ============================================================================


// ============================================================================
// TYPES
// ============================================================================

type CloneStep = 'name' | 'marketo-prompt' | 'marketo-config' | 'webinar-marketo'

interface CloneEventProps {
  item: EventDashboardItem | null
  onClose: () => void
  onCloned: () => void
}

// ============================================================================
// HELPERS
// ============================================================================

const isDXInPerson = (item: EventDashboardItem) =>
  item.cloudType === 'ExperienceCloud' && item.eventType?.toLowerCase() === 'in-person'

const isExperienceCloudWebinar = (item: EventDashboardItem) =>
  item.cloudType === 'ExperienceCloud' && item.eventType?.toLowerCase() === 'webinar'

// ============================================================================
// COMPONENT
// ============================================================================

export const CloneEvent: React.FC<CloneEventProps> = ({ item, onClose, onCloned }) => {
  const toast = useToast()

  const [step, setStep] = useState<CloneStep>('name')
  const [title, setTitle] = useState('')
  const [marketoData, setMarketoData] = useState<MarketoIntegrationData>({})
  const [webinarMarketoId, setWebinarMarketoId] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleClose = useCallback(() => {
    setStep('name')
    setTitle('')
    setMarketoData({})
    setWebinarMarketoId('')
    onClose()
  }, [onClose])

  const handleNameContinue = useCallback(() => {
    if (!item || !title.trim()) return

    if (isDXInPerson(item)) {
      setStep('marketo-prompt')
    } else if (isExperienceCloudWebinar(item)) {
      setStep('webinar-marketo')
    } else {
      executeClone({})
    }
  }, [item, title])

  const executeClone = useCallback(async (
    marketoIntegration: MarketoIntegrationData,
    marketoFormUrl?: string,
  ) => {
    if (!item || !title.trim()) return

    setIsPending(true)
    try {
      const eventResponse = await cachedApi.getEventFull(item.eventId)

      if ('error' in eventResponse) {
        toast.error('Failed to load event data for cloning')
        return
      }

      const cloneableData = filterEventData(eventResponse, 'clone')
      const locale = eventResponse.defaultLocale || 'en-US'

      const clonedEventData: Record<string, any> = {
        ...cloneableData,
        enTitle: title.trim(),
        published: false,
        liveUpdate: false,
      }

      if (clonedEventData.localizations?.[locale]) {
        clonedEventData.localizations[locale].title = title.trim()
      }

      const hasMarketo = marketoIntegration.eventType && marketoIntegration.eventType !== 'no-integration'
      if (hasMarketo) {
        clonedEventData.marketoIntegration = marketoIntegration
      } else {
        delete clonedEventData.marketoIntegration
      }

      if (marketoFormUrl) {
        clonedEventData.registration = { type: 'Marketo', formData: marketoFormUrl }
      }

      const result = await apiService.createEventExternal(clonedEventData, locale)

      if ('error' in result) {
        toast.error(`Failed to clone event: ${result.error}`)
      } else {
        const newEventId = result.event?.eventId || result.eventId
        handleClose()
        toast.success('Event cloned successfully!', {
          duration: 5000,
          action: {
            label: 'View',
            onPress: () => { window.location.hash = `#/events/edit/${newEventId}` },
          },
        })
        onCloned()
      }
    } catch (err) {
      console.error('Error cloning event:', err)
      toast.error('Failed to clone event')
    } finally {
      setIsPending(false)
    }
  }, [item, title, handleClose, onCloned, toast])

  // ============================================================================
  // STEP RENDERS
  // ============================================================================

  const renderNameStep = () => (
    <>
      <Content>
        <Text>Give your event a unique name.</Text>
        <TextField
          label=""
          value={title}
          onChange={setTitle}
          UNSAFE_style={{ width: '100%' }}
          autoFocus
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && title.trim()) handleNameContinue()
          }}
        />
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={handleClose}>Cancel</Button>
        <Button
          variant="accent"
          onPress={handleNameContinue}
          isDisabled={!title.trim() || isPending}
          isPending={isPending}
        >Continue</Button>
      </ButtonGroup>
    </>
  )

  const renderMarketoPromptStep = () => (
    <>
      <Content>
        <Text>Do you need Marketo integration?</Text>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={handleClose}>Cancel</Button>
        <Button variant="secondary" onPress={() => executeClone({})}>No</Button>
        <Button variant="accent" onPress={() => { setMarketoData({}); setStep('marketo-config') }}>Yes</Button>
      </ButtonGroup>
    </>
  )

  const renderMarketoConfigStep = () => (
    <>
      <Content>
        <Text>Enter Marketo configurations</Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          <Picker
            label="Event type"
            selectedKey={marketoData.eventType || ''}
            onSelectionChange={(key) => setMarketoData(prev => ({ ...prev, eventType: String(key) }))}
            UNSAFE_style={{ width: '100%' }}
          >
            {EVENT_TYPE_OPTIONS.filter(o => o.key !== 'no-integration').map(o => <PickerItem key={o.key} id={o.key}>{o.label}</PickerItem>)}
          </Picker>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <TextField
              label="Salesforce campaign ID"
              value={marketoData.salesforceCampaignId || ''}
              onChange={(v) => setMarketoData(prev => ({ ...prev, salesforceCampaignId: v }))}
              placeholder="Placeholder"
            />
            <TextField
              label="MCZ program name"
              value={marketoData.mczProgramName || ''}
              onChange={(v) => setMarketoData(prev => ({ ...prev, mczProgramName: v }))}
              placeholder="Placeholder"
            />
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <TextField
              label="Co-marketing partner"
              value={marketoData.coMarketingPartner || ''}
              onChange={(v) => setMarketoData(prev => ({ ...prev, coMarketingPartner: v }))}
              placeholder="Placeholder"
            />
            <Picker
              label="Event POI"
              selectedKey={marketoData.eventPoi || ''}
              onSelectionChange={(key) => setMarketoData(prev => ({ ...prev, eventPoi: String(key) }))}
            >
              {EVENT_POI_OPTIONS.filter(o => o.key !== 'no-poi').map(o => <PickerItem key={o.key} id={o.key}>{o.label}</PickerItem>)}
            </Picker>
          </div>
        </div>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={handleClose}>Cancel</Button>
        <Button
          variant="accent"
          onPress={() => executeClone(marketoData)}
          isDisabled={!marketoData.eventType || isPending}
          isPending={isPending}
        >Connect</Button>
      </ButtonGroup>
    </>
  )

  const renderWebinarMarketoStep = () => (
    <>
      <Content>
        <Text>Enter your Marketo ID</Text>
        <TextField
          label=""
          value={webinarMarketoId}
          onChange={setWebinarMarketoId}
          placeholder="ex. 12345678"
          UNSAFE_style={{ width: '100%', marginTop: 16 }}
          autoFocus
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && webinarMarketoId.trim()) executeClone({}, webinarMarketoId.trim())
          }}
        />
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={handleClose}>Cancel</Button>
        <Button
          variant="accent"
          onPress={() => executeClone({}, webinarMarketoId.trim())}
          isDisabled={!webinarMarketoId.trim() || isPending}
          isPending={isPending}
        >Connect</Button>
      </ButtonGroup>
    </>
  )

  const dialogSize = step === 'marketo-config' ? 'L' : 'M'

  return (
    <DialogTrigger
      isOpen={!!item}
      onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}
    >
      <div style={{ display: 'none' }} />
      <Dialog size={dialogSize}>
        <Heading slot="title">Clone event</Heading>
        {step === 'name' && renderNameStep()}
        {step === 'marketo-prompt' && renderMarketoPromptStep()}
        {step === 'marketo-config' && renderMarketoConfigStep()}
        {step === 'webinar-marketo' && renderWebinarMarketoStep()}
      </Dialog>
    </DialogTrigger>
  )
}
