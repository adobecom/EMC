import { requiresEnTitleConfirmation } from './enTitleConfirmation'

describe('requiresEnTitleConfirmation', () => {
  it('never requires confirmation for en-US locale', () => {
    expect(requiresEnTitleConfirmation('en-US', 'Titre', '')).toBe(false)
    expect(requiresEnTitleConfirmation('en-US', 'Titre', 'Titre')).toBe(false)
  })

  it('never requires confirmation when locale is unset', () => {
    expect(requiresEnTitleConfirmation(undefined, 'Titre', '')).toBe(false)
  })

  it('requires confirmation for a non-English locale with an empty enTitle', () => {
    expect(requiresEnTitleConfirmation('fr-FR', 'Titre de l’événement', '')).toBe(true)
  })

  it('requires confirmation for a non-English locale with whitespace-only enTitle', () => {
    expect(requiresEnTitleConfirmation('fr-FR', 'Titre', '   ')).toBe(true)
  })

  it('requires confirmation when enTitle still matches the localized name', () => {
    expect(requiresEnTitleConfirmation('fr-FR', 'Titre', 'Titre')).toBe(true)
  })

  it('requires confirmation when enTitle matches name after trimming', () => {
    expect(requiresEnTitleConfirmation('fr-FR', 'Titre', '  Titre  ')).toBe(true)
  })

  it('does not require confirmation once enTitle is distinct from name', () => {
    expect(requiresEnTitleConfirmation('fr-FR', 'Titre', 'English Title')).toBe(false)
  })
})
