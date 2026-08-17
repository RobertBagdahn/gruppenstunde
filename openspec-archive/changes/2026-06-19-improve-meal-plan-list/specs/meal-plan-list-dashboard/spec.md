# meal-plan-list-dashboard Specification

## Purpose
Defines the section-based meal plan overview with prioritized hero cards, readiness traffic light, countdown timer, and reference plan section.

## ADDED Requirements

### Requirement: Section-based list layout
The list page at `/meal-plans/app` SHALL display meal plans in four hierarchically ordered sections:
1. **Top 5** (always expanded): The 5 closest upcoming plans sorted by `start_datetime` ascending
2. **Weitere Pläne** (collapsed by default): Remaining upcoming plans (positions 6+)
3. **Referenzpläne** (collapsed by default): Community-verified templates (`owner_id === null`, `status === 'verified'`)
4. **Vergangene Pläne** (collapsed by default): All plans with `end_datetime < now`

#### Scenario: User sees top 5 upcoming plans
- **WHEN** an authenticated user navigates to `/meal-plans/app` and has at least 1 upcoming plan
- **THEN** the Top-5 section is expanded showing up to 5 plans with hero-card styling, sorted closest-first

#### Scenario: Fewer than 5 upcoming plans
- **WHEN** the user has only 3 upcoming plans
- **THEN** the Top-5 section shows all 3 plans and the "Weitere" section is hidden

#### Scenario: No upcoming plans
- **WHEN** the user has no upcoming plans
- **THEN** the Top-5 and "Weitere" sections are hidden; remaining sections still display

#### Scenario: Section toggle
- **WHEN** the user clicks a collapsed section header ("Weitere Pläne", "Referenzpläne", or "Vergangene Pläne")
- **THEN** the section expands to show its plans in a compact card grid

### Requirement: Hero card for top-5 plans
Each plan in the Top-5 section SHALL be displayed as a prominent hero card containing: name, status badge, event link (if any), date range, countdown ("Noch X Tage" or "Heute"/"Morgen"), progress bar (filled/total meals), portions with reserve factor, budget per person per day (if set), nutritional tags, and a colored traffic light indicator.

#### Scenario: Hero card shows all information
- **WHEN** a top-5 plan is rendered
- **THEN** the card shows name, badge, date range, countdown, progress bar with percentage, portion count, and Ampel dot

#### Scenario: Plan with linked event
- **WHEN** a plan has `event_id` and `event_name`
- **THEN** the card shows "Verknüpft mit: <event_name>" as a clickable link to the event

#### Scenario: Plan with budget
- **WHEN** a plan has `budget_per_person_per_day` set
- **THEN** the card shows budget info (e.g. "7,00 €/Person/Tag")

#### Scenario: Plan with nutritional tags
- **WHEN** a plan has nutritional tags
- **THEN** the card displays them as small labeled badges

### Requirement: Ampel (traffic light) readiness indicator
Every plan card SHALL display a colored traffic light indicator computed from `filled_meals_count / meals_count`:
- **Green** (🟢): coverage ≥ 80%
- **Yellow** (🟡): coverage > 0% and < 80%
- **Red** (🔴): coverage === 0% or `meals_count === 0`

#### Scenario: Plan is 100% filled
- **WHEN** `filled_meals_count === meals_count && meals_count > 0`
- **THEN** the Ampel is green and the progress bar shows 100%

#### Scenario: Plan is partially filled
- **WHEN** `filled_meals_count` is between 1 and 79% of `meals_count`
- **THEN** the Ampel is yellow and the progress bar shows the fill percentage with color yellow

#### Scenario: Plan has no filled meals
- **WHEN** `filled_meals_count === 0` or `meals_count === 0`
- **THEN** the Ampel is red

### Requirement: Countdown display
Each upcoming plan SHALL display a countdown to its start date:
- Future: "Noch X Tage" where X = days between now and `start_datetime`
- Today: "Heute"
- Tomorrow: "Morgen"
- Past start but not past end: "Läuft bereits"
- No dates set: countdown hidden

#### Scenario: Plan starts in 12 days
- **WHEN** the plan's `start_datetime` is 12 days in the future
- **THEN** the card shows "Noch 12 Tage"

#### Scenario: Plan starts today
- **WHEN** the plan's `start_datetime` is today
- **THEN** the card shows "Heute"

#### Scenario: Plan has no dates
- **WHEN** the plan has no `start_datetime`
- **THEN** no countdown is displayed

### Requirement: Progress bar
Every card in the Top-5 and "Weitere" sections SHALL display a progress bar showing `filled_meals_count / meals_count` as a colored bar with percentage label and absolute numbers.

#### Scenario: Plan with progress
- **WHEN** a plan has 15 filled and 20 total meals
- **THEN** the progress bar shows "75% (15/20 Mahlzeiten)" with a 75%-filled bar colored according to Ampel status

### Requirement: Quick action buttons
Each Top-5 hero card SHALL include quick-action buttons:
- "Öffnen" — navigates to `/meal-plans/:id`
- "Einkaufsliste" — navigates to `/meal-plans/:id` with `?tab=shopping` query parameter
- Context menu (MoreVertical) — "Als Vorlage verwenden", "Löschen"

#### Scenario: User clicks "Einkaufsliste"
- **WHEN** the user clicks "Einkaufsliste" on a hero card
- **THEN** the system navigates to the plan detail with the shopping tab pre-selected

### Requirement: Reference plan section
The "Referenzpläne" section SHALL display community-verified plans (`owner_id === null`, `status === 'verified'`) as compact cards. Each card SHALL include a "Als Vorlage verwenden" action that opens the create dialog with the plan pre-selected as source.

#### Scenario: Reference plans available
- **WHEN** verified community plans exist
- **THEN** they appear in the collapsed "Referenzpläne" section

#### Scenario: No reference plans
- **WHEN** no verified community plans exist
- **THEN** the "Referenzpläne" section is hidden

### Requirement: Ampel filter chips
The list page SHALL provide quick-filter chips for the readiness status: "Alle", "🟢 Bereit", "🟡 In Arbeit", "🔴 Lückenhaft". Selecting a chip filters the displayed plans by Ampel status.

#### Scenario: User filters for yellow plans
- **WHEN** the user clicks the "🟡 In Arbeit" chip
- **THEN** only plans with yellow Ampel status are shown in the Top-5 and "Weitere" sections

### Requirement: Time-range filter chips
The list page SHALL provide quick-filter chips for time ranges: "Diese Woche", "Nächste Woche", "Nächster Monat". These filter upcoming plans to the respective date range.

#### Scenario: User filters for "Diese Woche"
- **WHEN** the user clicks "Diese Woche"
- **THEN** only plans starting within the current calendar week are shown

### Requirement: Backend provides filled_meals_count
The `GET /api/meal-plans/` endpoint SHALL include `filled_meals_count` in each `MealPlanOut` response, computed as the count of meals that have at least one associated `MealItem`.

#### Scenario: List response includes filled count
- **WHEN** the meal plan list is fetched
- **THEN** each plan object includes `filled_meals_count` as an integer
