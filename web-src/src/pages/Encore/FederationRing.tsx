/*
* <license header>
*/

import React, { useEffect, useRef, useState } from 'react'
import { Text } from '@react-spectrum/s2'
import { federatedOrganizers } from './data/federation'

interface Particle {
  id: number
  fromX: number
  fromY: number
  angle: number
  color: string
  t0: number
  deflected: boolean
}

interface FederationRingProps {
  contributing: boolean
  aggregated: boolean
  showOutlier: boolean
}

const W = 600
const H = 380
const CX = 300
const CY = 190
const RING_R = 145
const AGG_R = 50
const META_R = 80

const NAVY = 'var(--spectrum-global-color-blue-600)'
const RED = 'var(--spectrum-global-color-red-600)'
const MINT = 'var(--spectrum-global-color-green-600)'
const GOLD = 'var(--spectrum-global-color-yellow-400)'
const RING_GUIDE = 'var(--spectrum-global-color-gray-400)'
const MUTED_TEXT = 'var(--spectrum-global-color-gray-600)'

/** Animated federation ring: particles flow from each organizer to the secure aggregator. */
export const FederationRing: React.FC<FederationRingProps> = ({ contributing, aggregated, showOutlier }) => {
  const orgs = federatedOrganizers.map((o, i) => {
    const angle = (i / federatedOrganizers.length) * Math.PI * 2 - Math.PI / 2
    return { ...o, angle, x: CX + Math.cos(angle) * RING_R, y: CY + Math.sin(angle) * RING_R }
  })

  const [particles, setParticles] = useState<Particle[]>([])
  const idRef = useRef(0)

  useEffect(() => {
    if (!contributing) {
      setParticles([])
      return
    }
    const interval = setInterval(() => {
      orgs.forEach((o) => {
        if (Math.random() > 0.55) return
        const isFlagged = o.status === 'flagged-outlier' && showOutlier
        const id = idRef.current++
        setParticles((p) => [
          ...p.filter((x) => Date.now() - x.t0 < 2000),
          {
            id, fromX: o.x, fromY: o.y, angle: o.angle,
            color: isFlagged ? GOLD : o.self ? RED : NAVY,
            t0: Date.now(),
            deflected: isFlagged
          }
        ])
      })
    }, 280)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contributing, showOutlier])

  return (
    <div style={{ position: 'relative', borderRadius: 12, backgroundColor: 'var(--s2-container-bg)', overflow: 'hidden', minHeight: 400 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
        <circle cx={CX} cy={CY} r={RING_R} fill="none" stroke={RING_GUIDE} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="2 4" />

        {showOutlier && (
          <circle cx={CX} cy={CY} r={META_R} fill="none" stroke={GOLD} strokeOpacity={0.7} strokeWidth={2} strokeDasharray="6 4" />
        )}

        {contributing && orgs.map((o) => {
          const isFlagged = o.status === 'flagged-outlier' && showOutlier
          return (
            <line
              key={o.id} x1={o.x} y1={o.y} x2={CX} y2={CY}
              stroke={isFlagged ? GOLD : NAVY}
              strokeOpacity={isFlagged ? 0.35 : 0.12}
              strokeWidth={1}
              strokeDasharray={isFlagged ? '4 4' : '0'}
            />
          )
        })}

        <circle cx={CX} cy={CY} r={AGG_R} fill={aggregated ? MINT : NAVY} stroke="var(--s2-container-bg)" strokeWidth={3} />
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="11" fontWeight={700} fill="white">Secure</text>
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize="11" fontWeight={700} fill="white">Aggregator</text>
        <text x={CX} y={CY + AGG_R + 14} textAnchor="middle" fontSize="9" fill={MUTED_TEXT}>Bonawitz 2017</text>

        {orgs.map((o) => {
          const isFlagged = o.status === 'flagged-outlier' && showOutlier
          const fill = isFlagged ? GOLD : o.self ? RED : NAVY
          return (
            <g key={o.id}>
              <circle cx={o.x} cy={o.y} r={20} fill={fill} stroke="var(--s2-container-bg)" strokeWidth={2} />
              <text x={o.x} y={o.y + 4} textAnchor="middle" fontSize="10" fontWeight={700} fill="white">
                {o.label.replace('Org-', '').split(' ')[0]}
              </text>
              <text x={o.x} y={o.y + 36} textAnchor="middle" fontSize="9" fill={MUTED_TEXT}>ε={o.epsilon}</text>
              {o.self && (
                <text x={o.x} y={o.y - 28} textAnchor="middle" fontSize="9" fontWeight={700} fill={RED}>US</text>
              )}
            </g>
          )
        })}

        {particles.map((p) => (
          <ParticleDot key={p.id} p={p} target={{ x: CX, y: CY }} metaR={META_R} />
        ))}
      </svg>

      {aggregated && (
        <div
          style={{
            position: 'absolute', top: 12, left: 12, borderRadius: 6, padding: 8, maxWidth: 220,
            backgroundColor: 'var(--spectrum-global-color-green-100)',
            border: '1px solid var(--spectrum-global-color-green-600)'
          }}
        >
          <Text UNSAFE_style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--spectrum-global-color-green-700)' }}>
            Individual contributions: NOT VISIBLE
          </Text>
          <Text UNSAFE_style={{ fontSize: 11, color: MUTED_TEXT }}>Aggregator sees only the cryptographic sum.</Text>
        </div>
      )}

      {showOutlier && (
        <div
          style={{
            position: 'absolute', top: 12, right: 12, borderRadius: 6, padding: 8, maxWidth: 220,
            backgroundColor: 'var(--spectrum-global-color-yellow-100)',
            border: `1px solid ${GOLD}`
          }}
        >
          <Text UNSAFE_style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--spectrum-global-color-gray-900)' }}>
            Org-G deflected by meta-detector
          </Text>
          <Text UNSAFE_style={{ fontSize: 11, color: MUTED_TEXT }}>Gradient deviates 4.2σ — auto-excluded.</Text>
        </div>
      )}
    </div>
  )
}

function ParticleDot({ p, target, metaR }: { p: Particle, target: { x: number, y: number }, metaR: number }): React.ReactElement {
  const [pos, setPos] = useState({ x: p.fromX, y: p.fromY, opacity: 1 })

  useEffect(() => {
    const start = Date.now()
    let raf: number
    const tick = () => {
      const elapsed = Date.now() - start
      const dur = 1400
      const t = Math.min(1, elapsed / dur)

      if (p.deflected) {
        const dx = target.x - p.fromX
        const dy = target.y - p.fromY
        const dist = Math.hypot(dx, dy)
        const stopFrac = (dist - metaR - 12) / dist

        if (t < stopFrac) {
          setPos({ x: p.fromX + dx * t, y: p.fromY + dy * t, opacity: 1 })
        } else {
          const sx = p.fromX + dx * stopFrac
          const sy = p.fromY + dy * stopFrac
          const perpAngle = Math.atan2(dy, dx) + Math.PI / 2
          const tSince = (t - stopFrac) / (1 - stopFrac)
          setPos({
            x: sx + Math.cos(perpAngle) * tSince * 60,
            y: sy + Math.sin(perpAngle) * tSince * 60,
            opacity: 1 - tSince
          })
        }
      } else {
        const nx = p.fromX + (target.x - p.fromX) * t
        const ny = p.fromY + (target.y - p.fromY) * t
        setPos({ x: nx, y: ny, opacity: t < 0.85 ? 1 : (1 - t) / 0.15 })
      }

      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [p, target.x, target.y, metaR])

  return (
    <circle
      cx={pos.x} cy={pos.y} r={4} fill={p.color} opacity={pos.opacity}
      style={{ filter: `drop-shadow(0 0 4px ${p.color})` }}
    />
  )
}

export default FederationRing
