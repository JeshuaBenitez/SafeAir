# Contract: Auth Broker Boundary (Future Integration)

## Purpose
Definir la frontera de mensajeria para escenarios donde el frontend publique o suscriba eventos de autenticacion a traves de broker.

## Envelope
- eventId: string
- eventType: string
- occurredAt: string (ISO-8601)
- correlationId: string
- payload: object

## Published Events (Frontend -> Broker)

### auth.login.attempted
- payload:
  - identifier: string
  - source: "auth-login-page"

## Subscribed Events (Broker -> Frontend)

### auth.session.invalidated
- payload:
  - reason: string
  - occurredAt: string

### auth.profile.synced
- payload:
  - userId: string
  - displayName: string

## Notes
- La UI no interactua directamente con el broker; usa un puerto abstracto de mensajeria.
- En esta fase, los eventos pueden simularse en memoria para validar comportamiento visual.
- El contrato permite que el frontend sea publisher, subscriber o ambos, segun flujo de negocio.
