import { z } from 'zod/v4'
import { normalizeEmail } from './normalizeEmail.js'

const signupSchema = z.object({
  name: z.string().transform((v) => v.trim()).pipe(z.string().min(1)),
  email: z.string().transform(normalizeEmail).pipe(z.email()),
  password: z.string().min(8),
})

export type SignupInput = {
  name: string
  email: string
  password: string
}

export type ValidationSuccess = { success: true; data: SignupInput }
export type ValidationFailure = { success: false; code: string; message: string }
export type ValidationResult = ValidationSuccess | ValidationFailure

export function validateSignupInput(input: unknown): ValidationResult {
  const result = signupSchema.safeParse(input)

  if (result.success) {
    return { success: true, data: result.data as SignupInput }
  }

  return {
    success: false,
    code: 'VALIDATION_ERROR',
    message: result.error.issues[0].message,
  }
}
