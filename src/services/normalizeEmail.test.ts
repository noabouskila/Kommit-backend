import { describe, it, expect } from 'vitest'
import { normalizeEmail } from './normalizeEmail.js'

// ──────────────────────────────────────────────────────────────
// Section 3 du ticket KOM-06 : Unicite de l'email
// ──────────────────────────────────────────────────────────────

describe('Normalisation de l\'email (CA21)', () => {
  it('met en minuscules un email tout en majuscules', () => {
    expect(normalizeEmail('MARC@X.COM')).toBe('marc@x.com')
  })

  it('retire les espaces avant et apres', () => {
    expect(normalizeEmail(' marc@x.com ')).toBe('marc@x.com')
  })

  it('combine minuscules et trim : " MARC@X.COM " devient "marc@x.com"', () => {
    expect(normalizeEmail(' MARC@X.COM ')).toBe('marc@x.com')
  })

  it('ne change rien si l\'email est deja normalise', () => {
    expect(normalizeEmail('marc@x.com')).toBe('marc@x.com')
  })

  it('normalise un email en casse mixte', () => {
    expect(normalizeEmail('Marc@Example.Com')).toBe('marc@example.com')
  })

  it('retire les espaces interieurs en debut et fin seulement', () => {
    expect(normalizeEmail('  alice@example.com  ')).toBe('alice@example.com')
  })
})
