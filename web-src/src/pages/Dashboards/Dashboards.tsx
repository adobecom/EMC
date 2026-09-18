/*
* <license header>
*/

import React, { useState } from 'react'
import {
  ActionButton,
  AlertDialog,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Heading,
  Picker,
  PickerItem,
  Text,
  TextField,
  Tooltip,
  TooltipTrigger,
} from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import Delete from '@react-spectrum/s2/icons/Delete'
import Edit from '@react-spectrum/s2/icons/Edit'
import Print from '@react-spectrum/s2/icons/Print'
import GraphBarChartIllustration from '@react-spectrum/s2/illustrations/linear/GraphBarChart'
import { useDashboard } from '../../contexts'
import { ResourceEmptyState, LoadingSpinner } from '../../components/shared'
import { DashboardCanvas } from './DashboardCanvas'
import { IMS } from '../../types'

interface DashboardsProps {
  ims: IMS
}

export const Dashboards: React.FC<DashboardsProps> = () => {
  const {
    dashboards,
    activeDashboard,
    activeDashboardId,
    isAtCap,
    isLoaded,
    maxDashboards,
    createDashboard,
    renameDashboard,
    deleteDashboard,
    setActiveDashboard,
  } = useDashboard()
  const [dashboardToDelete, setDashboardToDelete] = useState<string | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')

  if (!isLoaded) {
    return (
      <div className={style({ padding: 32 })}>
        <LoadingSpinner message="Loading dashboards..." />
      </div>
    )
  }

  if (dashboards.length === 0) {
    return (
      <div className={style({ padding: 32 })}>
        <ResourceEmptyState
          illustration={<GraphBarChartIllustration aria-hidden />}
          title="No dashboards yet"
          description="Build a custom dashboard to track Series, Events, and platform user trends over time."
          actions={
            <Button variant="accent" onPress={() => createDashboard('Untitled dashboard')}>
              Create dashboard
            </Button>
          }
        />
      </div>
    )
  }

  const dashboardToDeleteName = dashboards.find((d) => d.id === dashboardToDelete)?.name

  return (
    <div className={style({ display: 'flex', flexDirection: 'column', gap: 24, padding: 32 })}>
      <div className={`no-print ${style({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}`}>
        <Picker
          label="Dashboard"
          labelPosition="side"
          selectedKey={activeDashboardId ?? undefined}
          onSelectionChange={(key) => setActiveDashboard(key as string)}
          styles={style({ width: 260 })}
        >
          {dashboards.map((dashboard) => (
            <PickerItem key={dashboard.id} id={dashboard.id}>{dashboard.name}</PickerItem>
          ))}
        </Picker>

        <div className={style({ display: 'flex', gap: 8, alignItems: 'center' })}>
          <ActionButton isQuiet aria-label="Print dashboard" onPress={() => window.print()}>
            <Print />
          </ActionButton>
          {activeDashboard && (
            <>
              <ActionButton
                isQuiet
                aria-label="Rename dashboard"
                onPress={() => {
                  setNameDraft(activeDashboard.name)
                  setIsRenaming(true)
                }}
              >
                <Edit />
              </ActionButton>
              <ActionButton
                isQuiet
                aria-label="Delete dashboard"
                onPress={() => setDashboardToDelete(activeDashboard.id)}
              >
                <Delete />
              </ActionButton>
            </>
          )}
          <TooltipTrigger delay={0} isDisabled={!isAtCap}>
            <Button variant="secondary" isDisabled={isAtCap} onPress={() => createDashboard('Untitled dashboard')}>
              New dashboard
            </Button>
            <Tooltip>Maximum of {maxDashboards} dashboards reached. Delete one to create another.</Tooltip>
          </TooltipTrigger>
          {isAtCap && (
            <Text UNSAFE_style={{ fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}>
              Limit of {maxDashboards} reached
            </Text>
          )}
        </div>
      </div>

      {activeDashboard && (
        <>
          <Heading level={2}>{activeDashboard.name}</Heading>
          <DashboardCanvas dashboard={activeDashboard} />
        </>
      )}

      <DialogTrigger isOpen={isRenaming} onOpenChange={setIsRenaming}>
        <div style={{ display: 'none' }} />
        <Dialog size="S">
          {({ close }) => (
            <>
              <Heading slot="title">Rename dashboard</Heading>
              <Content>
                <TextField
                  label="Name"
                  value={nameDraft}
                  onChange={setNameDraft}
                  styles={style({ width: '[100%]' })}
                  autoFocus
                  isRequired
                />
              </Content>
              <ButtonGroup>
                <Button variant="secondary" onPress={close}>Cancel</Button>
                <Button
                  variant="accent"
                  isDisabled={!nameDraft.trim()}
                  onPress={() => {
                    if (activeDashboard) renameDashboard(activeDashboard.id, nameDraft.trim())
                    close()
                  }}
                >
                  Save
                </Button>
              </ButtonGroup>
            </>
          )}
        </Dialog>
      </DialogTrigger>

      <DialogTrigger isOpen={!!dashboardToDelete} onOpenChange={(open) => !open && setDashboardToDelete(null)}>
        <div style={{ display: 'none' }} />
        <AlertDialog
          title="Delete dashboard"
          variant="destructive"
          primaryActionLabel="Delete"
          cancelLabel="Cancel"
          onPrimaryAction={() => {
            if (dashboardToDelete) deleteDashboard(dashboardToDelete)
            setDashboardToDelete(null)
          }}
          onCancel={() => setDashboardToDelete(null)}
        >
          Delete dashboard <strong>{dashboardToDeleteName}</strong>? This can&apos;t be undone.
        </AlertDialog>
      </DialogTrigger>
    </div>
  )
}
