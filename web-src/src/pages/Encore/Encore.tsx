/*
* <license header>
*/

import React, { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { Heading, TabPanel } from '@react-spectrum/s2'
import { style } from '@react-spectrum/s2/style' with { type: 'macro' }
import { ACTS, EncoreStepper } from './EncoreStepper'
import { Act0Setup } from './acts/Act0Setup'
import { Act1Forecast } from './acts/Act1Forecast'
import { Act2Optimize } from './acts/Act2Optimize'
import { Act3Outreach } from './acts/Act3Outreach'
import { Act4Audit } from './acts/Act4Audit'
import { Act5Federation } from './acts/Act5Federation'
import { Act6Substitution } from './acts/Act6Substitution'
import { Act7Summary } from './acts/Act7Summary'
import { Act8Extended } from './acts/Act8Extended'

const DEFAULT_ACT = ACTS[0].id

interface EncoreViewProps {
  actId: string
}

const EncoreView: React.FC<EncoreViewProps> = ({ actId }) => {
  const navigate = useNavigate()
  const activeId = ACTS.some((a) => a.id === actId) ? actId : DEFAULT_ACT

  useEffect(() => {
    if (actId !== activeId) navigate(`/encore/${activeId}`, { replace: true })
  }, [actId, activeId, navigate])

  const onActivate = (id: string): void => navigate(`/encore/${id}`)

  return (
    <div className={style({ maxWidth: 1400, marginX: 'auto', paddingX: 24, paddingY: 24, display: 'flex', flexDirection: 'column', gap: 16 })}>
      <Heading level={1}>ENCORE</Heading>

      <EncoreStepper activeId={activeId} onActivate={onActivate}>
        <TabPanel id="act0"><Act0Setup onNavigate={onActivate} /></TabPanel>
        <TabPanel id="act1"><Act1Forecast /></TabPanel>
        <TabPanel id="act2"><Act2Optimize onNavigate={onActivate} /></TabPanel>
        <TabPanel id="act3"><Act3Outreach onNavigate={onActivate} /></TabPanel>
        <TabPanel id="act4"><Act4Audit onNavigate={onActivate} /></TabPanel>
        <TabPanel id="act5"><Act5Federation onNavigate={onActivate} /></TabPanel>
        <TabPanel id="act6"><Act6Substitution onNavigate={onActivate} /></TabPanel>
        <TabPanel id="act7"><Act7Summary onNavigate={onActivate} /></TabPanel>
        <TabPanel id="act8"><Act8Extended /></TabPanel>
      </EncoreStepper>
    </div>
  )
}

/** ENCORE — AI-driven speaker scouting, slate optimization, and audit-ready outreach (mock data, no backend). */
export const Encore: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={DEFAULT_ACT} replace />} />
      <Route path=":actId" element={<EncoreParamView />} />
      <Route path="*" element={<Navigate to={DEFAULT_ACT} replace />} />
    </Routes>
  )
}

const EncoreParamView: React.FC = () => {
  const { actId } = useParams<{ actId: string }>()
  return <EncoreView actId={actId ?? DEFAULT_ACT} />
}

export default Encore
