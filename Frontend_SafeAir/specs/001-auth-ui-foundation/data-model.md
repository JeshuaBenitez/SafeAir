# Data Model: Auth UI Foundation

## 1. AuthCredentials
- Description: Credenciales ingresadas por el usuario para autenticarse.
- Fields:
  - identifier: string (correo electronico o identificador de usuario)
  - password: string
- Validation rules:
  - identifier requerido, formato valido de correo cuando aplique
  - password requerida, longitud minima de seguridad de producto

## 2. RegisterDraft
- Description: Datos capturados en pantalla de registro para propuesta visual y futura integracion.
- Fields:
  - firstName: string
  - lastName: string
  - email: string
  - password: string
  - confirmPassword: string
- Validation rules:
  - firstName/lastName requeridos
  - email requerido con formato valido
  - password requerida con politica minima definida
  - confirmPassword debe coincidir con password

## 3. AuthSession
- Description: Resultado de autenticacion para estado de sesion del frontend.
- Fields:
  - authenticated: boolean
  - userId: string
  - displayName: string
  - tokenType: string
  - accessToken: string
  - expiresAt: string (ISO-8601)
- Validation rules:
  - authenticated true requiere accessToken y expiresAt

## 4. AuthError
- Description: Error funcional de autenticacion para mostrar mensajes consistentes.
- Fields:
  - code: string
  - message: string
  - recoverable: boolean
- Validation rules:
  - code y message obligatorios

## 5. AuthViewState
- Description: Estado de presentacion para login/register.
- Fields:
  - status: "idle" | "loading" | "success" | "error"
  - submitEnabled: boolean
  - message: string | null
  - fieldErrors: Record<string, string>
- State transitions:
  - idle -> loading (submit)
  - loading -> success (respuesta valida)
  - loading -> error (error de validacion/servicio)
  - error -> loading (reintento)

## Relationships
- AuthCredentials se transforma a LoginRequestDto.
- RegisterDraft se transforma a RegisterRequestDto cuando la integracion real este habilitada.
- AuthSession y AuthError alimentan AuthViewState mediante AuthFacade.
