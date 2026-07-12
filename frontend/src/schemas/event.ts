/**
 * Zod schemas for Event API.
 * MUST stay in sync with backend/event/schemas.py
 */
import { z } from 'zod';
import { NutritionalTagSchema } from './supply';

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
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  description: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EventLocation = z.infer<typeof EventLocationSchema>;

// --- Meeting Point ---

export const MeetingPointSchema = z.object({
  id: z.number(),
  name: z.string(),
  street: z.string(),
  zip_code: z.string(),
  city: z.string(),
  description: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  group_id: z.number().nullable().optional(),
  full_address: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type MeetingPoint = z.infer<typeof MeetingPointSchema>;

// --- Person ---

export const PersonSchema = z.object({
  id: z.number(),
  scout_name: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  address: z.string(),
  zip_code: z.string(),
  city: z.string(),
  email: z.string(),
  phone_number: z.string().nullable().optional(),
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
  is_system: z.boolean(),
  bookable_from: z.string().nullable().optional(),
  bookable_till: z.string().nullable().optional(),
  is_bookable: z.boolean(),
  created_at: z.string(),
});
export type BookingOption = z.infer<typeof BookingOptionSchema>;

// --- Participant Label ---

export const LabelSchema = z.object({
  id: z.number(),
  event_id: z.number(),
  name: z.string(),
  color: z.string(),
  created_at: z.string(),
});
export type Label = z.infer<typeof LabelSchema>;

// --- Custom Field ---

export const CustomFieldSchema = z.object({
  id: z.number(),
  event_id: z.number(),
  label: z.string(),
  field_type: z.string(),
  field_type_display: z.string(),
  options: z.array(z.string()).nullable().optional(),
  is_required: z.boolean(),
  sort_order: z.number(),
  created_at: z.string(),
});
export type CustomField = z.infer<typeof CustomFieldSchema>;

export const CustomFieldValueSchema = z.object({
  custom_field_id: z.number(),
  custom_field_label: z.string(),
  value: z.string(),
});
export type CustomFieldValue = z.infer<typeof CustomFieldValueSchema>;

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
  city: z.string(),
  email: z.string(),
  phone_number: z.string().nullable().optional(),
  birthday: z.string().nullable(),
  gender: z.string(),
  nutritional_tags: z.array(NutritionalTagSchema),
  is_paid: z.boolean(),
  total_paid: z.string(), // Decimal as string
  remaining_amount: z.string(), // Decimal as string
  labels: z.array(LabelSchema),
  custom_field_values: z.array(CustomFieldValueSchema),
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

// --- Timeline Entry ---

export const TimelineEntrySchema = z.object({
  id: z.number(),
  event_id: z.number(),
  participant_id: z.number().nullable(),
  participant_name: z.string(),
  user_id: z.number().nullable(),
  user_email: z.string(),
  action_type: z.string(),
  action_type_display: z.string(),
  description: z.string(),
  metadata: z.record(z.unknown()),
  created_at: z.string(),
});
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>;

// --- Payment ---

export const PaymentSchema = z.object({
  id: z.number(),
  participant_id: z.number(),
  participant_name: z.string(),
  amount: z.string(), // Decimal as string
  method: z.string(),
  method_display: z.string(),
  received_at: z.string(),
  location: z.string(),
  note: z.string(),
  created_by_id: z.number().nullable(),
  created_by_email: z.string(),
  created_at: z.string(),
});
export type Payment = z.infer<typeof PaymentSchema>;

export const PaymentCreateSchema = z.object({
  participant_id: z.number(),
  amount: z.string(),
  method: z.string(),
  received_at: z.string(),
  location: z.string().optional(),
  note: z.string().optional(),
});
export type PaymentCreate = z.infer<typeof PaymentCreateSchema>;

// --- Event Phase ---

export const EventPhaseSchema = z.enum([
  'draft',
  'pre_registration',
  'registration',
  'pre_event',
  'running',
  'completed',
]);
export type EventPhase = z.infer<typeof EventPhaseSchema>;

// --- Participant Stats ---

export const OptionStatsSchema = z.object({
  option_id: z.number(),
  option_name: z.string(),
  count: z.number(),
  max_participants: z.number(),
  participants: z.array(z.string()),
});
export type OptionStats = z.infer<typeof OptionStatsSchema>;

export const ParticipantStatsSchema = z.object({
  total: z.number(),
  by_option: z.array(OptionStatsSchema),
});
export type ParticipantStats = z.infer<typeof ParticipantStatsSchema>;

// --- User Registration ---

export const UserRegistrationSchema = z.object({
  is_registered: z.boolean(),
  registration_id: z.number().nullable().optional(),
  participant_count: z.number(),
});
export type UserRegistration = z.infer<typeof UserRegistrationSchema>;

// --- Invitation Counts ---

export const InvitationCountsSchema = z.object({
  total: z.number(),
  accepted: z.number(),
  pending: z.number(),
});
export type InvitationCounts = z.infer<typeof InvitationCountsSchema>;

// --- Invitation Status ---

export const InvitationStatusSchema = z.object({
  user_id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  scout_name: z.string(),
  status: z.string(), // "accepted" or "pending"
  invited_via: z.string(), // "direct" or "group"
  group_name: z.string(),
});
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;

// --- Responsible Person ---

export const ResponsiblePersonSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
});
export type ResponsiblePerson = z.infer<typeof ResponsiblePersonSchema>;

// --- Event ---

// --- Event Day Slot ---

export const EventDaySlotSchema = z.object({
  id: z.number(),
  event_id: z.number(),
  date: z.string(), // ISO date string "YYYY-MM-DD"
  start_time: z.string().nullable().optional(), // "HH:MM:SS"
  end_time: z.string().nullable().optional(),
  title: z.string(),
  notes: z.string(),
  content_type: z.string().nullable().optional(), // e.g. "groupsession", "game"
  object_id: z.number().nullable().optional(),
  content_title: z.string().nullable().optional(),
  content_slug: z.string().nullable().optional(),
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EventDaySlot = z.infer<typeof EventDaySlotSchema>;

// --- Event ---

export const EventListSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  color: z.string(),
  icon: z.string(),
  is_template: z.boolean(),
  manual_phase: z.string().nullable().optional(),
  meal_plan_id: z.number().nullable().optional(),
  location: z.string(),
  event_location: EventLocationSchema.nullable().optional(),
  meeting_point: MeetingPointSchema.nullable().optional(),
  pickup_point: MeetingPointSchema.nullable().optional(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  registration_deadline: z.string().nullable(),
  is_public: z.boolean(),
  booking_options: z.array(BookingOptionSchema),
  packing_list_id: z.number().nullable().optional(),
  registration_count: z.number(),
  participant_count: z.number(),
  phase: EventPhaseSchema,
  is_registered: z.boolean(),
  is_invited: z.boolean(),
  created_at: z.string(),
});
export type EventList = z.infer<typeof EventListSchema>;

export const EventDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  color: z.string(),
  icon: z.string(),
  is_template: z.boolean(),
  manual_phase: z.string().nullable().optional(),
  meal_plan_id: z.number().nullable().optional(),
  location: z.string(),
  event_location: EventLocationSchema.nullable().optional(),
  meeting_point: MeetingPointSchema.nullable().optional(),
  pickup_point: MeetingPointSchema.nullable().optional(),
  invitation_text: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  registration_deadline: z.string().nullable(),
  registration_start: z.string().nullable(),
  is_public: z.boolean(),
  guest_registration_enabled: z.boolean(),
  guest_registration_url: z.string().nullable().optional(),
  participant_visibility: z.string(),
  booking_options: z.array(BookingOptionSchema),
  packing_list_id: z.number().nullable().optional(),
  responsible_persons_detail: z.array(ResponsiblePersonSchema),
  registration_count: z.number(),
  participant_count: z.number(),
  phase: EventPhaseSchema,
  is_manager: z.boolean(),
  is_registered: z.boolean(),
  my_registration: RegistrationSchema.nullable(),
  all_registrations: z.array(RegistrationSchema).nullable(),
  user_registration: UserRegistrationSchema.nullable().optional(),
  participant_stats: ParticipantStatsSchema.nullable().optional(),
  invitation_counts: InvitationCountsSchema.nullable().optional(),
  day_slots: z.array(EventDaySlotSchema),
  created_at: z.string(),
  updated_at: z.string(),
});
export type EventDetail = z.infer<typeof EventDetailSchema>;

// --- Export ---

export const ExportColumnSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(), // "standard", "computed", "custom_field"
});
export type ExportColumn = z.infer<typeof ExportColumnSchema>;

export const ExportFilterSchema = z.object({
  is_paid: z.boolean().nullable().optional(),
  booking_option_id: z.number().nullable().optional(),
  label_id: z.number().nullable().optional(),
});
export type ExportFilter = z.infer<typeof ExportFilterSchema>;

export const ExportConfigSchema = z.object({
  format: z.string(), // "excel", "csv", "pdf"
  columns: z.array(z.string()), // column IDs or ["all"]
  filters: ExportFilterSchema.nullable().optional(),
});
export type ExportConfig = z.infer<typeof ExportConfigSchema>;

// --- Statistics ---

export const BookingOptionCapacitySchema = z.object({
  name: z.string(),
  max_participants: z.number(),
  current_count: z.number(),
  fill_percentage: z.number(),
});
export type BookingOptionCapacity = z.infer<typeof BookingOptionCapacitySchema>;

export const CapacityStatsSchema = z.object({
  booking_options: z.array(BookingOptionCapacitySchema),
  total_capacity: z.number(),
  total_registered: z.number(),
  total_fill_percentage: z.number(),
});
export type CapacityStats = z.infer<typeof CapacityStatsSchema>;

export const PaymentByMethodSchema = z.object({
  method: z.string(),
  count: z.number(),
  total_amount: z.string(), // Decimal as string
});
export type PaymentByMethod = z.infer<typeof PaymentByMethodSchema>;

export const PaymentStatsSchema = z.object({
  total_expected: z.string(),
  total_received: z.string(),
  total_outstanding: z.string(),
  paid_count: z.number(),
  unpaid_count: z.number(),
  paid_percentage: z.number(),
  payment_by_method: z.array(PaymentByMethodSchema),
});
export type PaymentStats = z.infer<typeof PaymentStatsSchema>;

export const GenderDistributionSchema = z.object({
  gender: z.string(),
  count: z.number(),
  percentage: z.number(),
});
export type GenderDistribution = z.infer<typeof GenderDistributionSchema>;

export const AgeDistributionSchema = z.object({
  age_group: z.string(),
  count: z.number(),
  percentage: z.number(),
});
export type AgeDistribution = z.infer<typeof AgeDistributionSchema>;

export const DemographicsStatsSchema = z.object({
  gender_distribution: z.array(GenderDistributionSchema),
  age_distribution: z.array(AgeDistributionSchema),
});
export type DemographicsStats = z.infer<typeof DemographicsStatsSchema>;

export const RegistrationTimelinePointSchema = z.object({
  date: z.string(),
  cumulative_count: z.number(),
});
export type RegistrationTimelinePoint = z.infer<typeof RegistrationTimelinePointSchema>;

export const StatsSchema = z.object({
  capacity: CapacityStatsSchema,
  payment: PaymentStatsSchema,
  demographics: DemographicsStatsSchema,
  registration_timeline: z.array(RegistrationTimelinePointSchema),
});
export type Stats = z.infer<typeof StatsSchema>;

// --- Mail ---

export const MailFilterSchema = z.object({
  is_paid: z.boolean().nullable().optional(),
  booking_option_id: z.number().nullable().optional(),
  label_id: z.number().nullable().optional(),
});
export type MailFilter = z.infer<typeof MailFilterSchema>;

export const MailCreateSchema = z.object({
  subject: z.string(),
  body: z.string(),
  recipient_type: z.string(), // "all", "filtered", "selected"
  filters: MailFilterSchema.nullable().optional(),
  participant_ids: z.array(z.number()).nullable().optional(),
});
export type MailCreate = z.infer<typeof MailCreateSchema>;

export const FailedRecipientSchema = z.object({
  participant_id: z.number(),
  email: z.string(),
  error: z.string(),
});
export type FailedRecipient = z.infer<typeof FailedRecipientSchema>;

export const MailResultSchema = z.object({
  sent_count: z.number(),
  failed_count: z.number(),
  failed_recipients: z.array(FailedRecipientSchema),
});
export type MailResult = z.infer<typeof MailResultSchema>;

// --- Generate Invitation ---

export const GenerateInvitationSchema = z.object({
  invitation_text: z.string(),
  ai_interaction_id: z.string().uuid().nullable().optional(),
});
export type GenerateInvitation = z.infer<typeof GenerateInvitationSchema>;

// --- Guest Registration ---

export const GuestRegistrationPersonSchema = z.object({
  first_name: z.string().min(1, 'Vorname ist erforderlich'),
  last_name: z.string().min(1, 'Nachname ist erforderlich'),
  scout_name: z.string().optional().default(''),
  birthday: z.string().nullable().optional(),
  gender: z.string().optional().default('no_answer'),
  phone_number: z.string().optional().default(''),
  booking_option_id: z.number({ required_error: 'Buchungsoption ist erforderlich' }),
});
export type GuestRegistrationPerson = z.infer<typeof GuestRegistrationPersonSchema>;

export const GuestRegistrationSchema = z.object({
  persons: z
    .array(GuestRegistrationPersonSchema)
    .min(1, 'Mindestens eine Person ist erforderlich'),
  email: z.string().email('Gültige E-Mail-Adresse erforderlich'),
});
export type GuestRegistration = z.infer<typeof GuestRegistrationSchema>;

export const GuestRegistrationResponseSchema = z.object({
  registration_id: z.number(),
  participant_count: z.number(),
  email: z.string(),
});
export type GuestRegistrationResponse = z.infer<typeof GuestRegistrationResponseSchema>;

// --- Paginated Response Schemas ---

export const PaginatedEventListSchema = z.object({
  items: z.array(EventListSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedEventList = z.infer<typeof PaginatedEventListSchema>;

export const PaginatedPersonSchema = z.object({
  items: z.array(PersonSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedPerson = z.infer<typeof PaginatedPersonSchema>;

export const PaginatedLocationSchema = z.object({
  items: z.array(EventLocationSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedLocation = z.infer<typeof PaginatedLocationSchema>;

export const PaginatedMeetingPointSchema = z.object({
  items: z.array(MeetingPointSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedMeetingPoint = z.infer<typeof PaginatedMeetingPointSchema>;

export const PaginatedInvitationStatusSchema = z.object({
  items: z.array(InvitationStatusSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedInvitationStatus = z.infer<typeof PaginatedInvitationStatusSchema>;

// --- Slug Check ---

export const SlugCheckSchema = z.object({
  available: z.boolean(),
  suggestion: z.string(),
});
export type SlugCheck = z.infer<typeof SlugCheckSchema>;

// --- Waitlist ---

export const WaitlistEntrySchema = z.object({
  id: z.number(),
  event_id: z.number(),
  booking_option_id: z.number(),
  booking_option_name: z.string(),
  user_id: z.number(),
  user_display_name: z.string(),
  person_id: z.number().nullable().optional(),
  person_display_name: z.string(),
  created_at: z.string(),
  notified_at: z.string().nullable().optional(),
  expired_at: z.string().nullable().optional(),
});
export type WaitlistEntry = z.infer<typeof WaitlistEntrySchema>;

export const WaitlistEntryCreateSchema = z.object({
  booking_option_id: z.number(),
  person_id: z.number().nullable().optional(),
});
export type WaitlistEntryCreate = z.infer<typeof WaitlistEntryCreateSchema>;

export const PaginatedWaitlistEntrySchema = z.object({
  items: z.array(WaitlistEntrySchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedWaitlistEntry = z.infer<typeof PaginatedWaitlistEntrySchema>;

// --- Attendance ---

export const AttendanceRecordSchema = z.object({
  id: z.number(),
  participant_id: z.number(),
  participant_name: z.string(),
  checked_in_at: z.string().nullable().optional(),
  checked_out_at: z.string().nullable().optional(),
  checked_in_by_id: z.number().nullable().optional(),
  is_checked_in: z.boolean(),
});
export type AttendanceRecord = z.infer<typeof AttendanceRecordSchema>;

export const PaginatedAttendanceRecordSchema = z.object({
  items: z.array(AttendanceRecordSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedAttendanceRecord = z.infer<typeof PaginatedAttendanceRecordSchema>;

// --- Checklist ---

export const ChecklistItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  is_met: z.boolean(),
  link: z.string(),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const ChecklistSchema = z.object({
  items: z.array(ChecklistItemSchema),
  all_met: z.boolean(),
});
export type Checklist = z.infer<typeof ChecklistSchema>;

// --- Room Assignment ---

export const RoomParticipantSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  scout_name: z.string(),
});
export type RoomParticipant = z.infer<typeof RoomParticipantSchema>;

export const RoomAssignmentSchema = z.object({
  id: z.number(),
  event_id: z.number(),
  name: z.string(),
  capacity: z.number(),
  description: z.string(),
  sort_order: z.number(),
  participants: z.array(RoomParticipantSchema),
  current_occupancy: z.number(),
  is_full: z.boolean(),
});
export type RoomAssignment = z.infer<typeof RoomAssignmentSchema>;

export const RoomAssignmentCreateSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  capacity: z.number().min(0).optional(),
  description: z.string().optional(),
  sort_order: z.number().optional(),
});
export type RoomAssignmentCreate = z.infer<typeof RoomAssignmentCreateSchema>;

// --- Parent Access Token ---

export const ParentAccessTokenSchema = z.object({
  id: z.number(),
  participant_id: z.number(),
  participant_name: z.string(),
  token: z.string(),
  email: z.string(),
  created_at: z.string(),
  expires_at: z.string(),
});
export type ParentAccessToken = z.infer<typeof ParentAccessTokenSchema>;

export const PaginatedParentAccessTokenSchema = z.object({
  items: z.array(ParentAccessTokenSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedParentAccessToken = z.infer<typeof PaginatedParentAccessTokenSchema>;

// --- Budget ---

export const BudgetItemSchema = z.object({
  id: z.number(),
  event_id: z.number(),
  description: z.string(),
  amount: z.string(), // Decimal as string
  category: z.string(),
  is_expense: z.boolean(),
  created_by_id: z.number().nullable().optional(),
  created_at: z.string(),
});
export type BudgetItem = z.infer<typeof BudgetItemSchema>;

export const BudgetItemCreateSchema = z.object({
  description: z.string().min(1, 'Beschreibung ist erforderlich'),
  amount: z.string(),
  category: z.string().optional().default('other'),
  is_expense: z.boolean().optional().default(true),
});
export type BudgetItemCreate = z.infer<typeof BudgetItemCreateSchema>;

export const BudgetSummarySchema = z.object({
  total_income: z.string(), // Decimal as string
  expected_income: z.string(),
  total_expenses: z.string(),
  balance: z.string(),
  items: z.array(BudgetItemSchema),
});
export type BudgetSummary = z.infer<typeof BudgetSummarySchema>;

// --- Import ---

export const ImportColumnMappingSchema = z.object({
  source_column: z.string(),
  target_field: z.string(),
});
export type ImportColumnMapping = z.infer<typeof ImportColumnMappingSchema>;

export const ImportRowPreviewSchema = z.object({
  row_number: z.number(),
  data: z.record(z.string()),
  errors: z.array(z.string()),
  is_valid: z.boolean(),
});
export type ImportRowPreview = z.infer<typeof ImportRowPreviewSchema>;

export const ImportPreviewSchema = z.object({
  total_rows: z.number(),
  valid_rows: z.number(),
  invalid_rows: z.number(),
  columns: z.array(z.string()),
  suggested_mappings: z.array(ImportColumnMappingSchema),
  preview_rows: z.array(ImportRowPreviewSchema),
});
export type ImportPreview = z.infer<typeof ImportPreviewSchema>;

export const ImportResultSchema = z.object({
  total_processed: z.number(),
  success_count: z.number(),
  error_count: z.number(),
  errors: z.array(z.string()),
});
export type ImportResult = z.infer<typeof ImportResultSchema>;
