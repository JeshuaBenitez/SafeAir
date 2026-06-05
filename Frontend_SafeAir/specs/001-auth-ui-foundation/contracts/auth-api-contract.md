# Contract: Auth API Boundary (Future Integration)

## Purpose
Definir el contrato tipado entre frontend y API para autenticacion sin acoplar UI a detalles de implementacion.

## Endpoint: Login
- Method: POST
- Path: /api/v1/auth/login

### Request Body
- identifier: string
- password: string

### Success Response (200)
- authenticated: boolean
- userId: string
- displayName: string
- tokenType: string
- accessToken: string
- expiresAt: string (ISO-8601)

### Error Response (4xx/5xx)
- code: string
- message: string
- recoverable: boolean

## Endpoint: Register (Future-Ready)
- Method: POST
- Path: /api/v1/auth/register
- Status in current phase: Optional / Not guaranteed by backend

### Request Body
- firstName: string
- lastName: string
- email: string
- password: string

### Success Response
- userId: string
- status: string

### Error Response
- code: string
- message: string
- recoverable: boolean

## Notes
- Este contrato se consume por adapters de infraestructura, nunca directo desde componentes UI.
- Cualquier cambio de contrato requiere versionado y mapeos explicitos DTO -> modelo de dominio.
