/*
* <license header>
*/

import React, { useState, useCallback, useEffect } from 'react'
import { Button, ButtonGroup, Content, Dialog, DialogTrigger, Heading, Picker, PickerItem, TextField } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { EventDashboardItem, MarketoIntegrationData } from '../../types/domain'
import { EVENT_TYPE_OPTIONS, EVENT_POI_OPTIONS } from '../EventForm/MarketoIntegrationComponent'
import { apiService, cachedApi } from '../../services/api'
import { EVENT_TYPES } from '../../config/constants'
import { filterEventData } from '../../utils/dataFilters'
import { useToast } from '../../contexts'

// ============================================================================
// CONSTANTS
// ============================================================================


// ============================================================================
// TYPES
// ============================================================================

type CloneStep = 'name' | 'marketo-prompt' | 'marketo-config'

interface CloneEventProps {
  item: EventDashboardItem | null
  existingNames: string[]
  onClose: () => void
  onCloned: () => void
}

// ============================================================================
// HELPERS
// ============================================================================

const isDXInPerson = (item: EventDashboardItem) =>
  item.cloudType === 'ExperienceCloud' && item.eventType === EVENT_TYPES.IN_PERSON

// ============================================================================
// COMPONENT
// ============================================================================

export const CloneEvent: React.FC<CloneEventProps> = ({ item, existingNames, onClose, onCloned }) => {
  const toast = useToast()

  const [step, setStep] = useState<CloneStep>('name')
  const [title, setTitle] = useState('')
  const [marketoData, setMarketoData] = useState<MarketoIntegrationData>({})
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (item) {
      setStep('name')
      setTitle(`${item.eventName} - copy`)
      setMarketoData({})
    }
  }, [item?.eventId])

  const handleClose = useCallback(() => {
    setStep('name')
    setTitle('')
    setMarketoData({})
    onClose()
  }, [onClose])

  const executeClone = useCallback(async (marketoIntegration: MarketoIntegrationData) => {
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

      // `published` is read-only server-side (always defaults to false on create) — not set here.
      const clonedEventData: Record<string, any> = {
        ...cloneableData,
        enTitle: title.trim(),
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

  const handleNameContinue = useCallback(() => {
if (!item || !title.trim()) return

    if (isDXInPerson(item)) {
      setStep('marketo-prompt')
    } else {
      executeClone({})
    }
  }, [item, title, executeClone])

  // ============================================================================
  // STEP RENDERS
  // ============================================================================

  const renderNameStep = () => {
    const isDuplicate = !!title.trim() && existingNames.some(
      n => n.trim().toLowerCase() === title.trim().toLowerCase()
    )
    return (
      <>
        <Content>
          <p className={style({ font: 'heading-xl', marginTop: 0, marginBottom: 16 })}>Give your event a unique name.</p>
          <TextField
            label=""
            value={title}
            onChange={setTitle}
            UNSAFE_style={{ width: '100%' }}
            autoFocus
            isInvalid={isDuplicate}
            errorMessage={isDuplicate ? 'This name is already taken.' : undefined}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' && title.trim() && !isDuplicate) handleNameContinue()
            }}
          />
        </Content>
        <ButtonGroup>
          <Button variant="secondary" onPress={handleClose}>Cancel</Button>
          <Button
            variant="accent"
            onPress={handleNameContinue}
            isDisabled={!title.trim() || isDuplicate || isPending}
            isPending={isPending}
          >Continue</Button>
        </ButtonGroup>
      </>
    )
  }

  const renderMarketoPromptStep = () => (
    <>
      <Content>
        <p className={style({ font: 'heading-xl', marginTop: 0, marginBottom: 16 })}>Do you need Marketo integration?</p>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={handleClose} isDisabled={isPending}>Cancel</Button>
        <Button variant="secondary" onPress={() => executeClone({})} isDisabled={isPending} isPending={isPending}>No</Button>
        <Button variant="accent" onPress={() => { setMarketoData({}); setStep('marketo-config') }} isDisabled={isPending}>Yes</Button>
      </ButtonGroup>
    </>
  )

  const renderMarketoConfigStep = () => (
    <>
      <Content>
        <p className={style({ font: 'heading-xl', marginTop: 0, marginBottom: 16 })}>Enter Marketo configurations</p>
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
              UNSAFE_style={{ flex: 1 }}
            />
            <TextField
              label="MCZ program name"
              value={marketoData.mczProgramName || ''}
              onChange={(v) => setMarketoData(prev => ({ ...prev, mczProgramName: v }))}
              placeholder="Placeholder"
              UNSAFE_style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <TextField
              label="Co-marketing partner"
              value={marketoData.coMarketingPartner || ''}
              onChange={(v) => setMarketoData(prev => ({ ...prev, coMarketingPartner: v }))}
              placeholder="Placeholder"
              UNSAFE_style={{ flex: 1 }}
            />
            <Picker
              label="Event POI"
              selectedKey={marketoData.eventPoi || ''}
              onSelectionChange={(key) => setMarketoData(prev => ({ ...prev, eventPoi: String(key) }))}
              UNSAFE_style={{ flex: 1 }}
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

  const dialogSize = step === 'marketo-config' ? 'L' : 'M'

  return (
    <DialogTrigger
      isOpen={!!item}
      onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}
    >
      <div style={{ display: 'none' }} />
      <Dialog size={dialogSize}>
        <Heading slot="title" UNSAFE_style={{ fontSize: 14, fontWeight: 'normal', color: 'var(--spectrum-gray-600)' }}>Clone event</Heading>
        {step === 'name' && renderNameStep()}
        {step === 'marketo-prompt' && renderMarketoPromptStep()}
        {step === 'marketo-config' && renderMarketoConfigStep()}

      </Dialog>
    </DialogTrigger>
  )
}
