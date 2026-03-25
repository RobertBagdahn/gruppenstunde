/**
 * Zod schemas for Event API.
 * MUST stay in sync with backend/event/schemas.py
 */
import { z } from 'zod';
import { NutritionalTagSchema } from './idea';

// --- Choices ---

export const ChoiceSchema = z.object({
  value: z.string(),
  label: z.string(),
});
export type Choice = z.infer<typeof ChoiceSchema>;

// --- Event Location ---

export const EventLocationSchema = z.object({
  id: z.number(),
  name: z.string(),
  street: z.string(),
  zip_code: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  description: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EventLocation = z.infer<typeof EventLocationSchema>;

// --- Person ---

export const PersonSchema = z.object({
  id: z.number(),
  scout_name: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  address: z.string(),
  zip_code: z.string(),
  email: z.string(),
  birthday: z.string().nullable(),
  gender: z.string(),
  nutritional_tags: z.array(NutritionalTagSchema),
  is_owner: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Person = z.infer<typeof PersonSchema>;

// --- Booking Option ---

export const BookingOptionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  price: z.string(), // Decimal comes as string from API
  max_participants: z.number(),
  current_participant_count: z.number(),
  is_full: z.boolean(),
  created_at: z.string(),
});
export type BookingOption = z.infer<typeof BookingOptionSchema>;

// --- Participant ---

export const ParticipantSchema = z.object({
  id: z.number(),
  person_id: z.number().nullable(),
  booking_option_id: z.number().nullable(),
  booking_option_name: z.string(),
  scout_name: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  address: z.string(),
  zip_code: z.string(),
  email: z.string(),
  birthday: z.string().nullable(),
  gender: z.string(),
  nutritional_tags: z.array(NutritionalTagSchema),
  is_paid: z.boolean(),
  created_at: z.string(),
});
export type Participant = z.infer<typeof ParticipantSchema>;

// --- Registration ---

export const RegistrationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  user_email: z.string(),
  event_id: z.number(),
  participants: z.array(ParticipantSchema),
  created_at: z.string(),
});
export type Registration = z.infer<typeof RegistrationSchema>;

// --- Event ---

export const EventListSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  location: z.string(),
  event_location: EventLocationSchema.nullable().optional(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  registration_deadline: z.string().nullable(),
  is_public: z.boolean(),
  booking_options: z.array(BookingOptionSchema),
  registration_count: z.number(),
  participant_count: z.number(),
  created_at: z.string(),
});
export type EventList = z.infer<typeof EventListSchema>;

export const EventDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  location: z.string(),
  event_location: EventLocationSchema.nullable().optional(),
  invitation_text: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  registration_deadline: z.string().nullable(),
  registration_start: z.string().nullable(),
  is_public: z.boolean(),
  booking_options: z.array(BookingOptionSchema),
  registration_count: z.number(),
  participant_count: z.number(),
  is_manager: z.boolean(),
  is_registered: z.boolean(),
  my_registration: RegistrationSchema.nullable(),
  all_registrations: z.array(RegistrationSchema).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EventDetail = z.infer<typeof EventDetailSchema>;

// --- Generate Invitation ---

export const GenerateInvitationSchema = z.object({
  invitation_text: z.string(),
});
export type GenerateInvitation = z.infer<typeof GenerateInvitationSchema>;
