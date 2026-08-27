/*
* <license header>
*/

import { audienceScore, candidateSpeakers, combinedScore } from './speakers'

describe('combinedScore', () => {
  it('weights cto-ai 42%, martech 31%, devrel 27% for Dr. Sarah Chen', () => {
    const sarah = candidateSpeakers.find((s) => s.id === 'spk-001')!
    // 0.87*0.42 + 0.71*0.31 + 0.74*0.27 = 0.3654 + 0.2201 + 0.1998 = 0.7853 -> 0.79
    expect(combinedScore(sarah)).toBeCloseTo(0.79, 2)
  })

  it('weights cto-ai 42%, martech 31%, devrel 27% for Emily Watson', () => {
    const emily = candidateSpeakers.find((s) => s.id === 'spk-006')!
    // 0.62*0.42 + 0.84*0.31 + 0.58*0.27 = 0.2604 + 0.2604 + 0.1566 = 0.6774 -> 0.68
    expect(combinedScore(emily)).toBeCloseTo(0.68, 2)
  })
})

describe('audienceScore', () => {
  it('returns the raw per-audience score object for a given audience id', () => {
    const sarah = candidateSpeakers.find((s) => s.id === 'spk-001')!
    expect(audienceScore(sarah, 'cto-ai')).toEqual({ p: 0.87, lo: 0.83, hi: 0.91 })
    expect(audienceScore(sarah, 'devrel')).toEqual({ p: 0.74, lo: 0.69, hi: 0.79 })
  })
})
