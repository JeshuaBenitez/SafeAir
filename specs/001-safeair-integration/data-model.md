# Data Model / Modelo de Datos

## AuthenticationSession / Sesión de Autenticación
Represents the authenticated state stored in the frontend after a successful login.

- `userId`: backend user identifier
- `email`: login identity used by the backend
- `accessToken`: JWT issued by the backend
- `tokenType`: token type returned by the API, typically `Bearer`
- `expiresAt`: expiration timestamp used to restore or clear session state
- `displayName`: display label for the current user

Relationships:
- Belongs to one `User` record in backend storage.
- Stored partially in frontend localStorage as session data.

Validation rules:
- `accessToken` must be non-empty.
- `expiresAt` must represent a future instant for an active session.

## User / Usuario
Represents a person authenticated into SafeAir.

- `id` or `userId`
- `email`
- `firstName`
- `lastName`
- `passwordHash` in backend only
- `role` if present in backend implementation

Relationships:
- Can own one active `AuthenticationSession` at a time in the frontend model.
- May be associated with rooms or instances depending on backend authorization rules.

Validation rules:
- `email` must be unique and valid.
- Password is never stored in plaintext.

## Room / Sala
Represents an environment being monitored.

- `roomId`
- `name`
- `location`
- `description`
- `status` or equivalent operational state

Relationships:
- Has many measurements over time.
- Has a current metric snapshot for dashboard display.
- May belong to an instance or setup entity in backend persistence.

Validation rules:
- `name` must be present.
- `roomId` must be stable enough to be used in route parameters.

## Measurement / Medición
Represents the latest or historical environmental reading.

- `measurementId`
- `roomId`
- `temperature`
- `humidity`
- `co2`
- `pm25`
- `measuredAt`
- `receivedAt`
- `status`

Relationships:
- Belongs to one `Room`.
- Can be listed as history or surfaced as the current metric snapshot.

Validation rules:
- Numeric fields must be finite numbers.
- `measuredAt` and `receivedAt` must be valid timestamps.
- Values must follow the backend domain thresholds where applicable.

## TelemetryEnvelope / Sobre de Telemetría
Represents the payload received from the emulator or MQTT layer before it is turned into a persisted measurement.

- `emulatorId`
- `timestamp`
- `roomState` or equivalent sensor data
- `source`

Relationships:
- Maps into `Measurement` and potentially `Room` setup data.

Validation rules:
- Payload must be schema-validated before persistence.
- Missing or malformed values must be rejected with a domain error.

## ConfigurationSnapshot / Instantánea de Configuración
Represents room or emulator setup data exposed by the backend.

- `roomId`
- `setup`
- `derivedSetup`
- `publishedAt`

Relationships:
- Linked to a `Room`.
- Used by operational endpoints and emulator setup workflows.

Validation rules:
- Configuration must be coherent with backend domain constraints.
- Derived values must be internally consistent with the source setup.
