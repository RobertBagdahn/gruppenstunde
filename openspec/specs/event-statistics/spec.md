## ADDED Requirements

### Requirement: Event statistics endpoint
The system SHALL provide a statistics endpoint returning aggregated KPIs for an event.

#### Scenario: Retrieve event statistics
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the system SHALL return a JSON object with all computed statistics

#### Scenario: Stats require manager permission
- **WHEN** a non-manager user requests GET `/api/events/{slug}/stats/`
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Capacity statistics
The statistics SHALL include booking capacity information.

#### Scenario: Capacity KPIs
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the response SHALL include for each booking option: name, max_participants, current_count, fill_percentage
- **THEN** the response SHALL include total: total_capacity (sum of all max), total_registered, total_fill_percentage

### Requirement: Payment statistics
The statistics SHALL include payment overview information.

#### Scenario: Payment KPIs
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the response SHALL include: total_expected (sum of all booking option prices), total_received (sum of all payments), total_outstanding (expected - received), paid_count, unpaid_count, paid_percentage
- **THEN** the response SHALL include payment_by_method: list of {method, count, total_amount}

### Requirement: Demographic statistics
The statistics SHALL include participant demographics.

#### Scenario: Gender distribution
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the response SHALL include gender_distribution: list of {gender, count, percentage}

#### Scenario: Age distribution
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the response SHALL include age_distribution: list of {age_group (e.g., "6-10", "11-14", "15-18", "19+"), count, percentage}
- **THEN** age SHALL be calculated relative to the event start_date (or today if no start_date)

### Requirement: Nutrition statistics
The statistics SHALL include dietary requirement summaries.

#### Scenario: Nutritional tags overview
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the response SHALL include nutritional_summary: list of {tag_name, count} for all nutritional tags used by participants

### Requirement: Registration timeline chart data
The statistics SHALL include registration-over-time data for chart rendering.

#### Scenario: Registration timeline
- **WHEN** GET `/api/events/{slug}/stats/`
- **THEN** the response SHALL include registration_timeline: list of {date, cumulative_count} showing how registrations grew over time
- **THEN** dates SHALL be grouped by day

### Requirement: Statistics frontend dashboard
The frontend SHALL display statistics as visual cards and charts.

#### Scenario: Stats view in dashboard
- **WHEN** the manager views the Übersicht tab
- **THEN** KPI cards SHALL show: Teilnehmer (count/capacity), Bezahlt (percentage), Einnahmen (amount)
- **THEN** a bar chart or donut chart SHALL show gender distribution
- **THEN** a bar chart SHALL show age distribution
- **THEN** a line chart SHALL show registration timeline
- **THEN** a list SHALL show nutritional requirements with counts
