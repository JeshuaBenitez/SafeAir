# Auth Contract / Contrato de Autenticación

## Purpose / Propósito
Define the transitional login contract between the existing Angular frontend and the existing Express backend.

## Decision / Decisión
- Transition option A is adopted.
- The backend accepts both `email` and `identifier` during the migration window.
- The frontend is standardized to send `email` for the live API path.

## Login Request / Solicitud de Login
Accepted fields during transition:
- `email`: preferred login identity
- `identifier`: backward-compatible alias allowed only during migration
- `password`: required secret

## Login Response / Respuesta de Login
Expected response shape:
- `authenticated`
- `userId`
- `displayName`
- `tokenType`
- `accessToken`
- `expiresAt`

## Error Behavior / Comportamiento de Error
- Invalid credentials return unauthorized error.
- Missing or invalid payload returns validation error.
- Frontend must clear session state on unauthorized responses.
