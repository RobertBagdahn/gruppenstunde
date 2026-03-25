/**
 * Zod schemas for Authentication API.
 * MUST stay in sync with backend/core/api.py
 */
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  is_staff: z.boolean(),
});
export type User = z.infer<typeof UserSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password1: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
  password2: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
}).refine((data) => data.password1 === data.password2, {
  message: 'Passwörter stimmen nicht überein',
  path: ['password2'],
});
export type RegisterInput = z.infer<typeof RegisterSchema>;
