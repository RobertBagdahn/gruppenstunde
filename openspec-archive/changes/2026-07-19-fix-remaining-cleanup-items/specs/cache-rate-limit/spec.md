## ADDED Requirements

### Requirement: Rate limiter uses Django cache backend
The `check_rate_limit()` function in `event/api/helpers.py` SHALL use `django.core.cache` (with `cache.incr()`) instead of an in-memory `defaultdict` for tracking request counts.

#### Scenario: First request in window
- **WHEN** a client IP makes its first request within the rate-limit window
- **THEN** the system SHALL set a cache key with value 1 and TTL equal to the window duration

#### Scenario: Subsequent requests increment counter
- **WHEN** a client IP makes a second request within the same window
- **THEN** the system SHALL atomically increment the cache key using `cache.incr()`

#### Scenario: Rate limit exceeded
- **WHEN** a client IP exceeds the configured `max_requests` within the window
- **THEN** the system SHALL raise `HttpError(429, "Zu viele Anfragen. Bitte warte einen Moment.")`

#### Scenario: Cache backend unavailable
- **WHEN** the cache backend (e.g. Redis) is unreachable
- **THEN** the system SHALL fall back to LocMemCache (per-process, best-effort) without crashing

#### Scenario: Multi-instance consistency
- **WHEN** the application runs on multiple Cloud Run instances
- **THEN** rate-limit state SHALL be shared across instances via the centralized cache backend
