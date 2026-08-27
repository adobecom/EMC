/*
* <license header>
*/

import type { Community } from '../types'

// Three communities surfaced by Leiden community detection across
// speakers, topics, sponsors, and audience persona clusters.
export const communities: Community[] = [
  {
    id: 'comm-ai-safety',
    label: 'AI Safety + Regulated-Industry',
    color: '#FA0F00',
    speakers: ['spk-001', 'spk-002', 'spk-003', 'spk-008', 'spk-012'],
    topics: ['AI Safety', 'AI Governance', 'Risk Modeling', 'EU AI Act'],
    sponsors: ['Snowflake', 'NVIDIA', 'ServiceNow'],
    personas: ['cto-ai']
  },
  {
    id: 'comm-agentic',
    label: 'Agentic AI + Developer',
    color: '#1E2761',
    speakers: ['spk-004', 'spk-005', 'spk-010', 'spk-011'],
    topics: ['Agentic AI', 'Foundation Models', 'Tool Use', 'Multi-Modal'],
    sponsors: ['GitHub', 'Hugging Face', 'AWS'],
    personas: ['cto-ai', 'devrel']
  },
  {
    id: 'comm-martech',
    label: 'MarTech + Marketing-Ops',
    color: '#4FBF73',
    speakers: ['spk-006', 'spk-007', 'spk-009'],
    topics: ['MarTech', 'Lead Scoring', 'CRM AI', 'Data Cloud'],
    sponsors: ['Salesforce', 'Databricks', 'AWS'],
    personas: ['martech']
  }
]
