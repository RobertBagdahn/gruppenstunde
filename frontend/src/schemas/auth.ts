/**
 * Zod schemas for the social-login-only auth API.
 * MUST stay in sync with backend/core/schemas.py (AuthUserOut, SessionOut, …).
 */
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  display_name: z.string(),
  is_staff: z.boolean(),
  is_superuser: z.boolean(),
  needs_onboarding: z.boolean(),
  providers: z.array(z.string()),
});
export type User = z.infer<typeof UserSchema>;

export const SessionSchema = z.object({
  is_authenticated: z.boolean(),
  user: UserSchema.nullable(),
});
export type Session = z.infer<typeof SessionSchema>;

export const AuthProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  login_url: z.string(),
});
export type AuthProvider = z.infer<typeof AuthProviderSchema>;

export const AuthProvidersSchema = z.object({
  providers: z.array(AuthProviderSchema),
  dev_login: z.boolean(),
  /** Transition period: e-mail/password accounts keep working. */
  password_login: z.boolean(),
});
export type AuthProviders = z.infer<typeof AuthProvidersSchema>;

export const SocialConnectionSchema = z.object({
  id: z.number(),
  provider: z.string(),
  provider_name: z.string(),
  email: z.string(),
  connected_at: z.string(),
  last_login: z.string().nullable(),
});
export type SocialConnection = z.infer<typeof SocialConnectionSchema>;

export const DevLoginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
});
export type DevLoginInput = z.infer<typeof DevLoginSchema>;

export const PasswordLoginSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Bitte gib dein Passwort ein'),
});
export type PasswordLoginInput = z.infer<typeof PasswordLoginSchema>;

export const PasswordRegisterSchema = z
  .object({
    email: z.string().email('Ungültige E-Mail-Adresse'),
    password1: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen lang sein'),
    password2: z.string(),
  })
  .refine((data) => data.password1 === data.password2, {
    message: 'Die Passwörter stimmen nicht überein',
    path: ['password2'],
  });
export type PasswordRegisterInput = z.infer<typeof PasswordRegisterSchema>;

export const OnboardingSchema = z.object({
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  scout_name: z.string().max(100).optional(),
});
export type OnboardingInput = z.infer<typeof OnboardingSchema>;
