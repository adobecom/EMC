/*
* <license header>
*/

import React, { useEffect, useRef, useState } from 'react'
import { ProgressBar, Text } from '@react-spectrum/s2'

interface DemoProgressBarProps {
  label: string
  durationMs?: number
  onDone?: () => void
}

/** Deterministic progress bar that completes in `durationMs` then calls onDone. */
export const DemoProgressBar: React.FC<DemoProgressBarProps> = ({ label, durationMs = 3000, onDone }) => {
  const [pct, setPct] = useState(0)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const elapsed = now - start
      const v = Math.min(100, Math.round((elapsed / durationMs) * 100))
      setPct(v)
      if (elapsed < durationMs) {
        raf = requestAnimationFrame(tick)
      } else {
        onDoneRef.current?.()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [durationMs])

  return (
    <div
      style={{
        borderRadius: 12,
        backgroundColor: 'var(--s2-container-bg)',
        boxShadow: 'var(--emc-nav-card-shadow)',
        padding: 20
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text UNSAFE_style={{ fontSize: 14, fontWeight: 600, color: 'var(--spectrum-global-color-gray-800)' }}>{label}</Text>
        <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--spectrum-global-color-gray-600)' }}>{pct}%</Text>
      </div>
      <ProgressBar aria-label={label} value={pct} />
    </div>
  )
}

export default DemoProgressBar
