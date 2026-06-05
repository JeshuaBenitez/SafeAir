# Go Live Checklist (staging)

Checklist operativo para dejar lista la integracion con Emuladores y Front.

## Bloque A - API en Render

- [ ] Repositorio en GitHub actualizado.
- [ ] Servicio Web creado en Render.
- [ ] Build command: `npm install && npm run build`.
- [ ] Start command: `npm run start`.
- [ ] Variables cargadas desde `.env.staging.example`.
- [ ] Health check `GET /health` retorna 200.

## Bloque B - Base de datos

- [ ] PostgreSQL de staging creado.
- [ ] Credenciales activas en Render.
- [ ] Seed ejecutado en staging (si aplica).
- [ ] Verificacion de insercion de telemetria en tablas.

## Bloque C - EMQX

- [ ] R1 (errores) creada y habilitada.
- [ ] R2 (normalizacion) creada y habilitada.
- [ ] ACL para emuladores aplicada.
- [ ] ACL para backend aplicada.
- [ ] Prueba de mensaje valido exitosa.
- [ ] Prueba de mensaje invalido exitosa.

## Bloque D - Handoff equipo

- [ ] Enviar URL API staging al Front.
- [ ] Enviar broker/topics/credenciales al equipo de Emuladores.
- [ ] Enviar contrato JSON de telemetria.
- [ ] Enviar criterio de aceptacion de integracion.

## Entregables minimos

1. URL de API staging funcionando.
2. Evidencia de telemetria persistida.
3. Evidencia de mensajes invalidos en topic de errores.
4. Documento de handoff compartido.
