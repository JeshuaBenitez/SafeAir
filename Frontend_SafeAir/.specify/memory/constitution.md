# SafeAir Frontend Constitution

## Core Principles

### I. Angular Clean Architecture (Non-Negotiable)
El frontend debe organizarse con separacion explicita entre capas: UI (componentes), presentacion (facades/view-models), dominio (casos de uso y modelos) e infraestructura (acceso a datos y mensajeria).

Reglas obligatorias:
- La UI no conoce detalles de transporte (HTTP, WebSocket, protocolo de broker, emuladores).
- La logica de negocio no depende de Angular framework APIs.
- Los adaptadores de infraestructura implementan contratos de dominio/presentacion, no al reves.
- Toda dependencia debe apuntar hacia capas mas internas, nunca hacia afuera.

### II. Feature-First + Standalone Reusable Components
La estructura base del codigo sera por features, no por tipo tecnico global.

Reglas obligatorias:
- Cada feature contiene sus componentes, rutas, estado de presentacion, servicios de feature y pruebas.
- Angular standalone components son el estandar por defecto.
- Los componentes de UI compartidos deben ser reutilizables, tipados y sin acoplamiento a una feature especifica.
- Un componente presentacional no debe ejecutar acceso a datos ni mensajeria directamente.

### III. Strict Typing and Contract-Driven Frontend
TypeScript strict es obligatorio en todo el proyecto y los contratos son la fuente de verdad para integraciones.

Reglas obligatorias:
- Prohibido `any` salvo excepcion documentada y acotada.
- Todos los DTOs/eventos para API y broker deben estar tipados y versionados.
- Transformaciones entre contratos externos y modelos internos deben ser explicitas.
- Se prioriza seguridad de tipos en build para detectar desalineaciones tempranas.

### IV. Integration Boundaries: API and Broker Only
El frontend no debe comunicarse directamente con emuladores ni depender de detalles internos de estos.

Reglas obligatorias:
- Unico acceso externo permitido: API y broker mediante puertos/adaptadores.
- El frontend puede actuar como publicador, suscriptor o ambos segun caso de uso, siempre via broker o API.
- El cambio de emulador a infraestructura real no debe requerir cambios en componentes UI.
- Credenciales, endpoints y canales deben inyectarse por configuracion, no hardcodeados.

### V. Visual Fidelity, Accessibility and Responsive Excellence
La experiencia de usuario debe mantener alta fidelidad respecto a Figma, con accesibilidad y responsive como criterios de calidad del mismo nivel que funcionalidad.

Reglas obligatorias:
- Implementar sistema de estilos mantenible con tokens (color, tipografia, espaciado, elevacion, breakpoints).
- Seguir patrones de accesibilidad (navegacion por teclado, foco visible, semantica, labels, contraste).
- Garantizar comportamiento correcto en mobile, tablet y desktop.
- Cualquier desviacion visual respecto a Figma debe documentarse y justificarse.

## Constraints and Technical Policies

- Mocks temporales, servicios fake y datos simulados deben implementar los mismos contratos tipados que API/broker reales.
- El modo mock debe ser intercambiable por configuracion (feature flag/env) sin alterar componentes ni casos de uso.
- La mensajeria debe abstraerse mediante interfaces para soportar evolucion futura sin romper features existentes.
- El codigo debe priorizar claridad: funciones pequenas, nombres semanticos, complejidad ciclomatica controlada y comentarios solo cuando aporten contexto no obvio.
- Se evita deuda tecnica por acoplamiento temprano a infraestructura no definitiva.

## Development Workflow and Quality Gates

- Todo cambio en feature incluye pruebas acordes al riesgo: unitarias para logica, pruebas de componente para UI y contract tests para adaptadores de API/broker.
- Definicion minima de Done por feature:
	- Cumple arquitectura por capas y fronteras de integracion.
	- Respeta contratos tipados vigentes.
	- Mantiene fidelidad visual con Figma en los estados principales.
	- Verifica accesibilidad basica y responsive.
	- No introduce dependencia directa a emuladores.
- Pull requests deben evidenciar impacto en arquitectura, UI y contratos.

## Governance

Esta constitucion prevalece sobre guias locales de implementacion.

Reglas de gobierno:
- Toda excepcion debe registrarse con alcance, motivo, riesgo y plan de remediacion.
- Toda enmienda requiere acuerdo del equipo frontend y registro en historial de arquitectura.
- Revisiones tecnicas y de diseno deben verificar explicitamente cumplimiento constitucional.
- Si un cambio contradice un principio, se debe ajustar el cambio o enmendar la constitucion antes de merge.

**Version**: 1.0.0 | **Ratified**: 2026-04-15 | **Last Amended**: 2026-04-15
