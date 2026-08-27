/*
* <license header>
*/

import React from 'react'
import { Text, ToggleButton } from '@react-spectrum/s2'
import { communities } from './data/communities'

interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  type: 'speaker' | 'topic' | 'sponsor' | 'persona'
  comm: string
}

const NODES: GraphNode[] = [
  // Speakers
  { id: 'spk-001', label: 'Sarah Chen', x: 280, y: 100, type: 'speaker', comm: 'comm-ai-safety' },
  { id: 'spk-002', label: 'Marcus Rivera', x: 220, y: 170, type: 'speaker', comm: 'comm-ai-safety' },
  { id: 'spk-003', label: 'Aisha Patel', x: 330, y: 220, type: 'speaker', comm: 'comm-ai-safety' },
  { id: 'spk-008', label: 'S. Andersson', x: 280, y: 290, type: 'speaker', comm: 'comm-ai-safety' },
  { id: 'spk-012', label: 'Priya Iyer', x: 200, y: 250, type: 'speaker', comm: 'comm-ai-safety' },
  { id: 'spk-004', label: 'Jin Lee', x: 600, y: 130, type: 'speaker', comm: 'comm-agentic' },
  { id: 'spk-005', label: 'C. Mendes', x: 670, y: 200, type: 'speaker', comm: 'comm-agentic' },
  { id: 'spk-010', label: 'O. Greene', x: 620, y: 280, type: 'speaker', comm: 'comm-agentic' },
  { id: 'spk-011', label: 'T. Hassan', x: 540, y: 200, type: 'speaker', comm: 'comm-agentic' },
  { id: 'spk-006', label: 'E. Watson', x: 940, y: 130, type: 'speaker', comm: 'comm-martech' },
  { id: 'spk-007', label: 'R. Krishnan', x: 1000, y: 200, type: 'speaker', comm: 'comm-martech' },
  { id: 'spk-009', label: 'David Park', x: 920, y: 270, type: 'speaker', comm: 'comm-martech' },
  // Topics
  { id: 'tpc-1', label: 'AI Safety', x: 160, y: 60, type: 'topic', comm: 'comm-ai-safety' },
  { id: 'tpc-2', label: 'EU AI Act', x: 200, y: 340, type: 'topic', comm: 'comm-ai-safety' },
  { id: 'tpc-3', label: 'Agentic AI', x: 500, y: 70, type: 'topic', comm: 'comm-agentic' },
  { id: 'tpc-4', label: 'Foundation Models', x: 700, y: 90, type: 'topic', comm: 'comm-agentic' },
  { id: 'tpc-5', label: 'MarTech', x: 1050, y: 80, type: 'topic', comm: 'comm-martech' },
  { id: 'tpc-6', label: 'Lead Scoring', x: 980, y: 340, type: 'topic', comm: 'comm-martech' },
  // Sponsors
  { id: 'spn-1', label: 'NVIDIA', x: 360, y: 70, type: 'sponsor', comm: 'comm-ai-safety' },
  { id: 'spn-2', label: 'ServiceNow', x: 380, y: 320, type: 'sponsor', comm: 'comm-ai-safety' },
  { id: 'spn-3', label: 'AWS', x: 540, y: 70, type: 'sponsor', comm: 'comm-agentic' },
  { id: 'spn-4', label: 'GitHub', x: 720, y: 290, type: 'sponsor', comm: 'comm-agentic' },
  { id: 'spn-5', label: 'Salesforce', x: 870, y: 80, type: 'sponsor', comm: 'comm-martech' },
  { id: 'spn-6', label: 'Snowflake', x: 1060, y: 280, type: 'sponsor', comm: 'comm-martech' },
  // Persona clusters
  { id: 'per-cto', label: 'CTO+AI Lead', x: 90, y: 200, type: 'persona', comm: 'comm-ai-safety' },
  { id: 'per-dev', label: 'Developer', x: 480, y: 340, type: 'persona', comm: 'comm-agentic' },
  { id: 'per-mar', label: 'Marketing-Ops', x: 1130, y: 200, type: 'persona', comm: 'comm-martech' }
]

const EDGES: Array<[string, string]> = [
  ['spk-001', 'tpc-1'], ['spk-002', 'tpc-1'], ['spk-008', 'tpc-2'], ['spk-003', 'tpc-2'],
  ['spk-001', 'spn-1'], ['spk-012', 'spn-1'], ['spk-008', 'spn-2'],
  ['spk-001', 'per-cto'], ['spk-002', 'per-cto'], ['spk-003', 'per-cto'],
  ['spk-004', 'tpc-3'], ['spk-005', 'tpc-4'], ['spk-010', 'tpc-4'], ['spk-011', 'tpc-3'],
  ['spk-004', 'spn-3'], ['spk-005', 'spn-4'], ['spk-011', 'spn-4'],
  ['spk-004', 'per-dev'], ['spk-010', 'per-dev'], ['spk-011', 'per-dev'],
  ['spk-006', 'tpc-5'], ['spk-007', 'tpc-5'], ['spk-009', 'tpc-6'],
  ['spk-006', 'spn-5'], ['spk-007', 'spn-5'], ['spk-009', 'spn-6'],
  ['spk-006', 'per-mar'], ['spk-007', 'per-mar'], ['spk-009', 'per-mar'],
  ['spk-010', 'spn-3'], ['spk-004', 'per-cto'], ['spk-001', 'tpc-3']
]

const COLOR_BY_TYPE: Record<GraphNode['type'], string> = {
  speaker: 'var(--spectrum-global-color-blue-600)',
  topic: 'var(--spectrum-global-color-green-600)',
  sponsor: 'var(--spectrum-global-color-yellow-400)',
  persona: 'var(--emc-encore-persona)'
}

const LEGEND: Array<{ key: string, color: string }> = [
  { key: 'Speakers', color: COLOR_BY_TYPE.speaker },
  { key: 'Topics', color: COLOR_BY_TYPE.topic },
  { key: 'Sponsors', color: COLOR_BY_TYPE.sponsor },
  { key: 'Persona Clusters', color: COLOR_BY_TYPE.persona }
]

interface GraphVizProps {
  highlightCommunity: string | null
  onToggleCommunity: (id: string) => void
}

/** Stylized property-graph SVG. Deterministic node positions, not a live force layout. */
export const GraphViz: React.FC<GraphVizProps> = ({ highlightCommunity, onToggleCommunity }) => {
  const isHighlighted = (commId: string) => !highlightCommunity || highlightCommunity === commId

  return (
    <div
      style={{
        borderRadius: 12,
        backgroundColor: 'var(--s2-container-bg)',
        boxShadow: 'var(--emc-nav-card-shadow)',
        padding: 16,
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text UNSAFE_style={{ fontSize: 14, fontWeight: 600, color: 'var(--spectrum-global-color-gray-800)' }}>
          Unified 4-Sided Property Graph
        </Text>
        <div style={{ display: 'flex', gap: 12 }}>
          {LEGEND.map((l) => (
            <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: l.color }} />
              <Text UNSAFE_style={{ fontSize: 11, color: 'var(--spectrum-global-color-gray-600)' }}>{l.key}</Text>
            </div>
          ))}
        </div>
      </div>

      <svg viewBox="0 0 1200 400" style={{ width: '100%', height: 360 }}>
        {communities.map((c) => {
          if (!isHighlighted(c.id)) return null
          const ns = NODES.filter((n) => n.comm === c.id)
          if (ns.length === 0) return null
          const xs = ns.map((n) => n.x)
          const ys = ns.map((n) => n.y)
          const cx = (Math.min(...xs) + Math.max(...xs)) / 2
          const cy = (Math.min(...ys) + Math.max(...ys)) / 2
          const r = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 1.6 + 30
          return (
            <g key={c.id}>
              <ellipse
                cx={cx} cy={cy} rx={r} ry={r * 0.75}
                fill={c.color} opacity={highlightCommunity === c.id ? 0.20 : 0.08}
                stroke={c.color} strokeOpacity={0.5} strokeDasharray="4 4"
              />
              <text x={cx} y={cy + r * 0.78} textAnchor="middle" fontSize="11" fontWeight={700} fill={c.color}>
                {c.label}
              </text>
            </g>
          )
        })}

        {EDGES.map(([a, b], i) => {
          const A = NODES.find((n) => n.id === a)
          const B = NODES.find((n) => n.id === b)
          if (!A || !B) return null
          const visible = isHighlighted(A.comm) || isHighlighted(B.comm)
          return (
            <line
              key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
              stroke="var(--spectrum-global-color-gray-500)" strokeOpacity={visible ? 0.35 : 0.06} strokeWidth={1}
            />
          )
        })}

        {NODES.map((n) => {
          const visible = isHighlighted(n.comm)
          return (
            <g key={n.id} opacity={visible ? 1 : 0.25}>
              <circle
                cx={n.x} cy={n.y} r={n.type === 'persona' ? 14 : 10}
                fill={COLOR_BY_TYPE[n.type]} stroke="var(--s2-container-bg)" strokeWidth={2}
              />
              <text
                x={n.x} y={n.y + 26} textAnchor="middle" fontSize="9.5"
                fontWeight={n.type === 'persona' ? 700 : 500}
                fill="var(--spectrum-global-color-gray-800)"
              >
                {n.label}
              </text>
            </g>
          )
        })}
      </svg>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {communities.map((c) => (
          <ToggleButton
            key={c.id}
            size="S"
            isSelected={highlightCommunity === c.id}
            onChange={() => onToggleCommunity(c.id)}
          >
            {c.label} · {c.speakers.length} speakers
          </ToggleButton>
        ))}
      </div>
    </div>
  )
}

export default GraphViz
