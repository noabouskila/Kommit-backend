import { describe, it, expect } from 'vitest'
import { validateSignupInput } from './authValidation.js'

// ──────────────────────────────────────────────────────────────
// Section 2 du ticket KOM-06 : Valeurs refusees
// ──────────────────────────────────────────────────────────────

describe('Validation du signup', () => {
  // ── CA10 — Email mal forme ou mot de passe court, refuse ───

  describe('CA10 — email mal forme ou mot de passe < 8 caracteres', () => {
    it('accepte un signup valide (email correct, mot de passe de 8 caracteres, prenom present)', () => {
      const result = validateSignupInput({
        name: 'Alice',
        email: 'alice@example.com',
        password: '12345678',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Alice')
        expect(result.data.email).toBe('alice@example.com')
        expect(result.data.password).toBe('12345678')
      }
    })

    it('refuse un email sans arobase', () => {
      const result = validateSignupInput({
        name: 'Alice',
        email: 'pas-un-email',
        password: '12345678',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR')
      }
    })

    it('refuse un email sans domaine', () => {
      const result = validateSignupInput({
        name: 'Alice',
        email: 'alice@',
        password: '12345678',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR')
      }
    })

    it('refuse un email vide', () => {
      const result = validateSignupInput({
        name: 'Alice',
        email: '',
        password: '12345678',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR')
      }
    })

    it('refuse un mot de passe de 7 caracteres', () => {
      const result = validateSignupInput({
        name: 'Alice',
        email: 'alice@example.com',
        password: '1234567',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR')
      }
    })

    it('accepte un mot de passe de 8 caracteres (le minimum)', () => {
      const result = validateSignupInput({
        name: 'Alice',
        email: 'alice@example.com',
        password: '12345678',
      })

      expect(result.success).toBe(true)
    })

    it('accepte un mot de passe tres long (pas de maximum)', () => {
      const result = validateSignupInput({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'a'.repeat(200),
      })

      expect(result.success).toBe(true)
    })

    it('refuse un mot de passe vide', () => {
      const result = validateSignupInput({
        name: 'Alice',
        email: 'alice@example.com',
        password: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR')
      }
    })
  })

  // ── CA11 — Signup sans prenom, refuse ──────────────────────

  describe('CA11 — signup sans prenom', () => {
    it('refuse quand le champ name est absent', () => {
      const result = validateSignupInput({
        email: 'alice@example.com',
        password: '12345678',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR')
      }
    })

    it('refuse quand le prenom est une chaine vide', () => {
      const result = validateSignupInput({
        name: '',
        email: 'alice@example.com',
        password: '12345678',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR')
      }
    })
  })

  // ── CA20 — Prenom d'espaces seulement, refuse ─────────────

  describe('CA20 — prenom d\'espaces seulement (trim puis rejet du vide)', () => {
    it('refuse un prenom fait uniquement d\'espaces', () => {
      const result = validateSignupInput({
        name: '   ',
        email: 'alice@example.com',
        password: '12345678',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR')
      }
    })

    it('refuse un prenom de tabulations et espaces', () => {
      const result = validateSignupInput({
        name: ' \t ',
        email: 'alice@example.com',
        password: '12345678',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR')
      }
    })

    it('accepte un prenom avec espaces autour mais du contenu, et le trim', () => {
      const result = validateSignupInput({
        name: '  Alice  ',
        email: 'alice@example.com',
        password: '12345678',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Alice')
      }
    })
  })
})
