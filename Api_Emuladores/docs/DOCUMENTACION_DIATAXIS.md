# Documentacion con Diataxis

Este proyecto usa el skill `documentation-writer` para mantener documentacion tecnica util y consistente.

## Objetivo

Separar la documentacion por intencion de uso para que cada lector encuentre lo que necesita rapidamente.

## Tipos de documento

- Tutorial: guia paso a paso para aprender.
- How-to: receta corta para resolver una tarea puntual.
- Reference: detalle tecnico de contratos, endpoints, DTOs, configuracion.
- Explanation: contexto de arquitectura y decisiones.

## Flujo recomendado

1. Definir tipo de documento.
2. Definir audiencia y objetivo.
3. Definir alcance (que entra y que queda fuera).
4. Proponer indice breve.
5. Escribir en Markdown siguiendo tono consistente del repo.

## Convenciones para este repo

- Mantener ejemplos alineados con `src/` y `database/`.
- Evitar duplicar informacion que ya esta en codigo fuente.
- Actualizar referencia de endpoints cuando cambien rutas en `src/api/routes/v1/`.
- Priorizar claridad sobre extension.
