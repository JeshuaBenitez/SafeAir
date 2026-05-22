# Research: Auth UI Foundation

## Decision 1: Angular standalone + feature-first architecture
- Decision: Usar Angular con componentes standalone y estructura por features (`core/shared/features`).
- Rationale: Reduce acoplamiento, facilita escalabilidad hacia dashboard y alinea la constitucion del proyecto.
- Alternatives considered:
  - Arquitectura por tipo tecnico global (components/services/models): descartada por menor escalabilidad en dominio.
  - NgModules clasicos: descartado para evitar complejidad innecesaria en nuevas features.

## Decision 2: Visual system basado en tokens SCSS
- Decision: Definir tokens de diseno para color, tipografia, espaciado, radios, sombras y estados visuales.
- Rationale: Mantiene fidelidad consistente con mockups de Figma y facilita ajustes globales sin retrabajo.
- Alternatives considered:
  - Estilos inline por componente: descartado por baja mantenibilidad.
  - CSS utility-only sin tokens de producto: descartado por riesgo de inconsistencia visual.

## Decision 3: Mock-first con puertos desacoplados
- Decision: Implementar `AuthRepositoryPort` y conectar `AuthMockRepositoryAdapter` en esta fase.
- Rationale: Permite entregar UX funcional sin backend final y reemplazar adapter por API real sin cambios en UI.
- Alternatives considered:
  - Consumir endpoint provisional directo desde componente: descartado por acoplar UI y romper clean architecture.
  - Simular solo en componente sin servicio: descartado por baja testabilidad y mala migracion futura.

## Decision 4: Contratos separados para API y broker
- Decision: Definir contratos de frontera para login/register (API) y eventos de autenticacion (broker) aunque no se implementen productivamente aun.
- Rationale: Asegura compatibilidad futura con integracion real y evita reinterpretaciones de payloads.
- Alternatives considered:
  - Posponer contratos hasta integracion real: descartado por mayor riesgo de retrabajo.

## Decision 5: Register como visual-first / future-ready
- Decision: Tratar register como pantalla visual operativa en UX, con submit mock y mensaje claro si backend real no soporta alta publica.
- Rationale: Cumple alcance actual y evita bloquear avance visual por dependencias externas.
- Alternatives considered:
  - Omitir register completo: descartado por romper continuidad visual del flujo auth.

## Decision 6: Baseline de accesibilidad y responsive desde primera iteracion
- Decision: Incluir navegacion por teclado, foco visible, labels semanticos, contraste suficiente y layouts fluidos mobile/tablet/desktop.
- Rationale: Reducir deuda tecnica y evitar retrabajo cuando crezca el modulo.
- Alternatives considered:
  - Dejar accesibilidad para fases futuras: descartado por alto costo de correccion posterior.

## Decision 7: Estrategia de pruebas incremental
- Decision: Combinar pruebas unitarias de validadores/facade, pruebas de componente para formularios y smoke e2e para rutas auth.
- Rationale: Cobertura balanceada para una feature visual con contratos tipados y flujos simples.
- Alternatives considered:
  - Solo e2e: descartado por baja velocidad de feedback.
  - Solo unitarias: descartado por no validar experiencia real de pantalla.
