# 📋 Documentación de la Organización Documental

Este documento explica cómo se reorganizó la documentación del proyecto SafeAir.

## Criterio de Organización

La documentación se clasificó en las siguientes categorías:
- **Documentación principal**: Documentos técnicos completos del sistema
- **EMQX**: Documentación específica del broker MQTT
- **Despliegue**: Guías de deployment a producción/Render
- **Reportes**: Documentación de funcionalidades de reportes
- **API**: Documentación general de la API
- **Histórico**: Documentos de referencia o históricos

## Archivos README NO Movidos

Los siguientes archivos README se dejaron en su ubicación original:

| Archivo | Ubicación |
|---------|-----------|
| README.md | Raíz del proyecto |
| Frontend_SafeAir/README.md | Dentro de Frontend_SafeAir/ |
| Api_Emuladores/README.md | Dentro de Api_Emuladores/ |
| SafeAir-System-Emulator/README.md | Dentro de SafeAir-System-Emulator/ |
| Frontend_SafeAir/tests/README.md | Dentro de Frontend_SafeAir/tests/ |
| Api_Emuladores/database/README.md | Dentro de Api_Emuladores/database/ |

## Archivos Movidos

### Desde la raíz del proyecto → specs/

| Origen | Destino | Categoría |
|--------|---------|-----------|
| `CAMBIO_EMQX_RESUMEN.md` | `specs/emqx/` | EMQX |
| `MIGRACION_EMQX.md` | `specs/emqx/` | EMQX |
| `DEPLOY_RENDER.md` | `specs/despliegue/` | Despliegue |
| `CAMBIOS_PRODUCCION.md` | `specs/despliegue/` | Despliegue |
| `ESCENARIOS_REPORTES.md` | `specs/reportes/` | Reportes |
| `NUEVAS_FUNCIONALIDADES_RANGO.md` | `specs/reportes/` | Reportes |

### Desde Api_Emuladores/docs/ → specs/

| Origen | Destino | Categoría |
|--------|---------|-----------|
| `EMQX_READY_STATUS.md` | `specs/emqx/` | EMQX |
| `EMQX_RULES.md` | `specs/emqx/` | EMQX |
| `EMQX_RULES_SETUP.md` | `specs/emqx/` | EMQX |
| `DEPLOY_RENDER_STAGING.md` | `specs/despliegue/` | Despliegue |
| `GO_LIVE_CHECKLIST.md` | `specs/despliegue/` | Despliegue |
| `ALINEACION_DICCIONARIO_DATOS.md` | `specs/api/` | API |
| `DOCUMENTACION_DIATAXIS.md` | `specs/api/` | API |
| `FUNCIONAMIENTO_INTEGRACION.md` | `specs/api/` | API |
| `HANDOFF_EMULATOR_INTEGRATION.md` | `specs/despliegue/` | Despliegue |
| `PLANTUML.md` | `specs/historico/` | Histórico |

## Documentos que YA estaban en specs/

Los siguientes documentos ya estaban en la carpeta specs/ y no fueron movidos:

- `specs/001-safeair-integration/documentacion-final-safeair.md`
- `specs/001-safeair-integration/despliegue-local-y-lan.md`
- `specs/001-safeair-integration/diagnostico-demo-local.md`
- `specs/001-safeair-integration/implementacion-demo-local.md`
- `specs/001-safeair-integration/distribuido-4-dispositivos.md`
- `specs/001-safeair-integration/contracts/*`
- `specs/001-safeair-integration/checklists/*`

Estos pertenecen a la documentación del proyecto principal y estão bien ubicados.

## Documentos NO Movidos ( especific components)

Los siguientes archivos NO fueron movidos porque pertenecen a specs específicos de componentes:

- `Frontend_SafeAir/specs/001-auth-ui-foundation/...` - Documentación específica del frontend
- `SafeAir-System-Emulator/specs/001-foundation-local-emulation/...` - Documentación específica del emulador
- `SafeAir-System-Emulator/specs/002-mqtt-async-adapter/...` - Documentación específica del emulador
- `.specify/...` - Archivos del sistema Specify (no tocar)

## Estado de Documentos

| Categoría | Cantidad | Estado |
|-----------|----------|--------|
| Documentación principal | 15+ | Vigente |
| EMQX | 6 | Vigente |
| Despliegue | 5 | Histórico |
| Reportes | 2 | Vigente |
| API | 3 | Vigente |
| Histórico | 1 | Referencia |

---

*Última actualización: Junio 2026*
