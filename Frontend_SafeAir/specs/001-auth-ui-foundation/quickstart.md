# Quickstart: Auth UI Foundation

## Objective
Implementar y validar el modulo visual de autenticacion (login + register) con arquitectura reutilizable y desacoplada para integracion futura.

## 1) Preparar estructura base
1. Crear capas `core`, `shared` y `features/auth`.
2. Agregar sistema de estilos con tokens SCSS para tema oscuro SafeAir.
3. Definir rutas base `/auth/login` y `/auth/register`.

## 2) Construir componentes reutilizables
1. Implementar `sa-auth-shell` y `sa-auth-card`.
2. Implementar `sa-form-input`, `sa-password-input`, `sa-primary-button` y `sa-text-link`.
3. Validar estados visuales (default, hover, focus, error, disabled, loading).

## 3) Implementar pantallas
1. Login page:
   - Formulario reactivo con validaciones
   - Flujo submit conectado a facade
2. Register page:
   - Formulario visual future-ready
   - Mensaje de disponibilidad futura si corresponde
3. Navegacion bidireccional entre login y register.

## 4) Preparar capa de datos y mocks
1. Definir `AuthRepositoryPort` y modelos tipados.
2. Implementar `AuthMockRepositoryAdapter` con escenarios: exito/error.
3. Registrar estrategia de inyeccion para futuro `AuthApiRepositoryAdapter`.

## 5) Verificaciones de calidad
1. Revisar fidelidad visual contra mockups (jerarquia, espaciado, color, tipografia).
2. Probar accesibilidad basica (tab order, foco visible, labels).
3. Verificar responsive en mobile/tablet/desktop.
4. Ejecutar pruebas unitarias/componentes/smoke e2e del flujo auth.

## 6) Criterios de salida de esta fase
- Login visual funcional con mock.
- Register visual coherente y preparado para integracion futura.
- Componentes reutilizables listos para nuevas pantallas.
- Sin acoplamiento de UI a emuladores ni detalles internos de mensajeria.
