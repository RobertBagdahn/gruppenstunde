## ADDED Requirements

### Requirement: Latitude and longitude fields on EventLocation and MeetingPoint
The `EventLocation` and `MeetingPoint` Django models SHALL each have two new nullable FloatField fields: `latitude` and `longitude`. Both fields SHALL default to `null`. The corresponding Pydantic schemas SHALL expose these fields as `Optional[float]`. The Zod schemas in the frontend SHALL mirror the backend schemas with `z.number().nullable()`.

#### Scenario: EventLocation with coordinates
- **WHEN** an EventLocation is created with address "Pfadfinderheim, Waldstraße 12, 80331 München" and coordinates latitude=48.1351, longitude=11.5820
- **THEN** the model SHALL store both coordinates and the API SHALL return them in the response

#### Scenario: EventLocation without coordinates
- **WHEN** an EventLocation is created with only an address and no coordinates
- **THEN** the latitude and longitude fields SHALL be `null` and the API SHALL return `null` for both fields

#### Scenario: MeetingPoint with coordinates
- **WHEN** a MeetingPoint is created with coordinates latitude=48.1400, longitude=11.5600
- **THEN** the model SHALL store both coordinates and the API SHALL return them in the response

#### Scenario: Schema sync between backend and frontend
- **WHEN** the Pydantic schema includes `latitude: Optional[float] = None` and `longitude: Optional[float] = None`
- **THEN** the Zod schema SHALL include `latitude: z.number().nullable()` and `longitude: z.number().nullable()`

### Requirement: Location detail view with OpenStreetMap map
Clicking on a location (EventLocation or MeetingPoint) anywhere in the event dashboard SHALL open a detail view displaying a map, the address, an optional description, and a link to OpenStreetMap for external routing. The map SHALL use react-leaflet with OpenStreetMap tile layers.

#### Scenario: User clicks on a location with coordinates
- **WHEN** the user clicks on an EventLocation that has latitude and longitude set
- **THEN** a detail view SHALL open showing an interactive OpenStreetMap map centered on the coordinates with a marker, the address text, the description (if any), and a link "Route in OpenStreetMap öffnen" pointing to `https://www.openstreetmap.org/directions?mlat={lat}&mlon={lon}`

#### Scenario: User clicks on a location without coordinates
- **WHEN** the user clicks on an EventLocation that has no coordinates
- **THEN** the detail view SHALL show the address text and description but display a placeholder instead of a map with the message "Keine Koordinaten vorhanden. Bearbeite den Ort, um eine Adresse mit Karte hinzuzufügen."

#### Scenario: User clicks on a meeting point with coordinates
- **WHEN** the user clicks on a MeetingPoint that has coordinates
- **THEN** the detail view SHALL show the map, address, time, and description of the meeting point

### Requirement: Geocoding via Nominatim API
The system SHALL use the Nominatim API (OpenStreetMap) for geocoding addresses to coordinates. Geocoding requests SHALL be debounced with a 1-second delay to respect Nominatim usage policies. The geocoding SHALL run in the frontend. No API keys SHALL be required.

#### Scenario: User enters an address for geocoding
- **WHEN** the user types "Pfadfinderheim, Waldstraße 12, München" in the address field
- **THEN** the system SHALL wait 1 second after the user stops typing, send a request to `https://nominatim.openstreetmap.org/search?q={address}&format=json`, and populate the latitude and longitude fields with the first result's coordinates

#### Scenario: Geocoding returns no results
- **WHEN** the user enters an address that Nominatim cannot resolve (e.g., "xyzabc123notreal")
- **THEN** the system SHALL display "Adresse konnte nicht gefunden werden. Bitte überprüfe die Eingabe oder setze den Marker manuell auf der Karte."

#### Scenario: Debounced geocoding prevents excessive requests
- **WHEN** the user types quickly, changing the address field multiple times within 1 second
- **THEN** only the final value SHALL trigger a Nominatim API request

#### Scenario: Nominatim API error
- **WHEN** the Nominatim API returns an error or is unreachable
- **THEN** the system SHALL display "Geocoding ist momentan nicht verfügbar. Du kannst den Marker manuell auf der Karte setzen."

### Requirement: Manual pin adjustment on map
The user SHALL be able to manually drag the map marker to adjust coordinates after geocoding. The latitude and longitude fields SHALL update in real-time when the marker is moved.

#### Scenario: User drags marker to new position
- **WHEN** the user drags the map marker from the geocoded position to a nearby location
- **THEN** the latitude and longitude fields SHALL update to reflect the new marker position

#### Scenario: Manual pin without prior geocoding
- **WHEN** the user clicks on the map without having entered an address
- **THEN** a marker SHALL be placed at the clicked position and the latitude and longitude fields SHALL be populated

### Requirement: Lazy-loaded map component
The map component using react-leaflet SHALL be lazy-loaded via `React.lazy()` and wrapped in a `Suspense` boundary. This ensures the Leaflet CSS and JS bundles are only loaded when a map is actually displayed.

#### Scenario: Map component lazy loading
- **WHEN** a page containing a location detail view is loaded
- **THEN** the map component SHALL NOT be included in the initial JavaScript bundle but loaded on demand when the detail view is opened

#### Scenario: Suspense fallback while map loads
- **WHEN** the map component is loading
- **THEN** a skeleton placeholder with the text "Karte wird geladen..." SHALL be displayed

### Requirement: Inline map preview in wizard step 3
The event creation wizard step 3 "Datum & Ort" SHALL display an inline map preview when a location with coordinates is added. The preview SHALL be a smaller, non-interactive version of the map showing the marker position.

#### Scenario: Location with coordinates in wizard
- **WHEN** the user adds a location with resolved coordinates in wizard step 3
- **THEN** a small map preview (200px height) SHALL be displayed below the address field showing the marker

#### Scenario: Location without coordinates in wizard
- **WHEN** the user adds a location without coordinates in wizard step 3
- **THEN** no map preview SHALL be displayed, only the address text

#### Scenario: Multiple locations in wizard
- **WHEN** the user adds multiple locations in wizard step 3
- **THEN** each location with coordinates SHALL show its own inline map preview

### Requirement: Django migration for coordinate fields
A Django migration SHALL add `latitude` and `longitude` fields to both `EventLocation` and `MeetingPoint` models. The migration SHALL be non-destructive and SHALL NOT affect existing data.

#### Scenario: Migration on existing data
- **WHEN** the migration runs on a database with existing EventLocation and MeetingPoint records
- **THEN** all existing records SHALL retain their current data and the new latitude/longitude fields SHALL be `null`

#### Scenario: Rollback migration
- **WHEN** the migration is reversed
- **THEN** the latitude and longitude fields SHALL be removed without data loss on other fields
