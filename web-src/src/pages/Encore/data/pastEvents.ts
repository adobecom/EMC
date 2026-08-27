/*
* <license header>
*/

import type { PastEvent, TargetEvent } from '../types'

export const pastEvents: PastEvent[] = [
  { id: 'evt-001', name: 'Adobe Summit 2024', city: 'Las Vegas', attendees: 12000, nps: 71, sessions: 78, sponsors: 14, status: 'completed' },
  { id: 'evt-002', name: 'Adobe MAX 2024', city: 'Los Angeles', attendees: 18000, nps: 79, sessions: 96, sponsors: 22, status: 'completed' },
  { id: 'evt-003', name: 'Marketo Engage Day 2024', city: 'San Francisco', attendees: 3200, nps: 68, sessions: 42, sponsors: 8, status: 'completed' },
  { id: 'evt-004', name: 'Adobe Symposium NY 2024', city: 'New York', attendees: 1800, nps: 73, sessions: 30, sponsors: 6, status: 'completed' },
  { id: 'evt-005', name: 'Adobe Summit 2025', city: 'Las Vegas', attendees: 14500, nps: 74, sessions: 84, sponsors: 16, status: 'completed' },
  { id: 'evt-006', name: 'Adobe MAX 2025', city: 'Los Angeles', attendees: 21000, nps: 81, sessions: 102, sponsors: 24, status: 'completed' },
  { id: 'evt-007', name: 'Marketo Engage Day 2025', city: 'San Francisco', attendees: 4000, nps: 71, sessions: 48, sponsors: 10, status: 'completed' },
  { id: 'evt-008', name: 'CXLive 2025 (partner)', city: 'Chicago', attendees: 2800, nps: 70, sessions: 36, sponsors: 9, status: 'completed' }
]

export const targetEvent: TargetEvent = {
  id: 'evt-max26-ai',
  name: 'Adobe MAX 2026 — AI Track',
  city: 'Los Angeles',
  dates: '2026-10-13 to 2026-10-16',
  attendeesForecast: 4200,
  sessions: 12,
  speakerBudgetUsd: 850000,
  personas: [
    { id: 'cto-ai', label: 'CTO and AI Lead', pct: 0.42 },
    { id: 'martech', label: 'Marketing Operations', pct: 0.31 },
    { id: 'devrel', label: 'Developer Advocate', pct: 0.27 }
  ],
  sponsors: ['AWS', 'NVIDIA', 'Snowflake', 'Databricks', 'Salesforce', 'ServiceNow', 'GitHub', 'Hugging Face'],
  status: 'planning'
}
