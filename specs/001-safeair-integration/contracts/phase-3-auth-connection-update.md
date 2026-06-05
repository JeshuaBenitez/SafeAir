# Phase 3 Auth Connection Update

## Fecha de ultima actualizacion / Last update date
- 2026-05-19

## Estado actual / Current state
- Se completo la alineacion del contrato de login entre frontend y backend.
- Se activo el manejo de sesion persistente y la restauracion de token en el arranque.
- Se habilitaron redirecciones para evitar mostrar login/registro cuando ya hay sesion.
- Queda pendiente validar el flujo end-to-end con el backend corriendo en la red local.

## Fecha de la actualizacion que se va a hacer / Planned update date
- 2026-05-19

## Cambios y actualizaciones (datos y fuentes) / Changes and updates (data and sources)

### 1) Datos de autenticacion enviados desde el frontend
- **Dato**: `email` y `password`
- **Fuente**: formulario de login en `LoginFormComponent`
- **Ruta**: `Form -> AuthCredentials -> LoginRequestDto -> POST /api/v1/auth/login`
- **Justificacion**: Se migra de `identifier` a `email` para alinear el contrato con el backend y eliminar ambiguedad.

### 2) Datos de sesion devueltos por el backend
- **Datos**: `authenticated`, `userId`, `displayName`, `tokenType`, `accessToken`, `expiresAt`
- **Fuente**: `AuthService.login()` en backend (usuario + JWT firmado)
- **Ruta**: `UserRepository -> AuthService -> AuthController -> Response`
- **Justificacion**: Se necesita una sesion completa para persistir en frontend y evitar valores simulados.

### 3) Persistencia y restauracion de sesion en frontend
- **Datos**: payload completo de sesion (`AuthSession`)
- **Fuente**: localStorage (`safeair.auth.session`)
- **Ruta**: `AuthFacade.restoreSession() -> ApiClient.setAuthToken()`
- **Justificacion**: Mantener sesion activa tras refresh y permitir navegacion protegida.

### 4) Control de rutas
- **Dato**: estado de sesion activa
- **Fuente**: `AuthSessionStorageService.getSession()`
- **Ruta**: `authSessionGuard` y `authRedirectGuard`
- **Justificacion**: Evitar acceso a rutas privadas sin sesion y evitar login cuando ya hay sesion.