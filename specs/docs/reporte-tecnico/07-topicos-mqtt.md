# Especificación de Tópicos MQTT y Payloads - SafeAir

Este documento especifica la interfaz de mensajería asíncrona implementada sobre el protocolo MQTT utilizando el broker EMQX. Detalla la estructura jerárquica de tópicos dinámicos, las firmas de payload reales y el formato de serialización.

---

## 1. Topología Jerárquica de Tópicos

SafeAir utiliza un esquema de tópicos estructurado dinámicamente mediante el identificador único del emulador (`emulatorId` o `emulatorExternalId` en base de datos, ej., `EMU-0001`):

```
                       safeair/ (Prefijo Raíz)
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
        {emulatorId}/               {emulatorId}/
         telemetry                    config
            │                           │
            ▼                           ▼
    [Telemetría Periódica]      [Configuración Aula]
   (Emulador -> Backend)       (Backend -> Emulador)
```

1. **`safeair/{emulatorId}/telemetry`**: Tópico donde el emulador de hardware publica periódicamente las mediciones de los sensores físicos simulados en el aula.
2. **`safeair/{emulatorId}/config`**: Tópico donde el backend publica las dimensiones físicas y parámetros del aula para inicializar o alterar la simulación en el emulador.
3. **`safeair/{emulatorId}/actuator-state`**: Tópico utilizado para la transmisión de comandos e ingesta de estados de los actuadores del aula (minisplits, purificadores y extractores).

---

## 2. Definición Real de Payloads en Código

### 2.1 Payload de Telemetría (`safeair/{emulatorId}/telemetry`)
Publicado por el Emulador Java de forma periódica. Emplea serialización en JSON nativo en el entorno de desarrollo y pruebas locales.

* **Frecuencia**: Cada 10 segundos (configurable).
* **Payload JSON**:
```json
{
  "temperature": 23.50,
  "humidity": 45.20,
  "co2": 720.00,
  "pm25": 12.50,
  "timestamp": "2026-06-08T04:20:00.000Z"
}
```

### 2.2 Payload de Control de Actuadores (`safeair/{emulatorId}/actuator-state`)
Este canal transporta los comandos de encendido/apagado y setpoints enviados desde el Frontend. El backend procesa la solicitud y publica el siguiente formato JSON estricto en el broker para que el Emulador Java lo interprete y aplique a sus variables térmicas:

* **Payload JSON**:
```json
{
  "roomId": "cf84a3b8-6a10-449e-b98a-924a1e948c2a",
  "deviceType": "minisplit",
  "action": "minisplit_on",
  "value": true,
  "source": "debug-dashboard",
  "timestamp": "2026-06-08T04:20:00.000Z"
}
```

* **Campos**:
  * `roomId`: Identificador UUID único de la habitación.
  * `deviceType`: Tipo de actuador (`minisplit`, `purifier`, `extractor`).
  * `action`: Comando específico (`minisplit_on`, `minisplit_off`, `purifier_on`, `purifier_off`, `extractor_on`, `extractor_off`, `set_temperature`).
  * `value`: Valor booleano de activación (`true`/`false`) o numérico para grados en acondicionadores de aire.
  * `source`: Identificador del cliente que emitió la acción (ej., `frontend`, `debug-dashboard`).
  * `timestamp`: Fecha en formato ISO 8601 del registro de la acción.

### 2.3 Payload de Configuración (`safeair/{emulatorId}/config`)
Publicado por el Backend cuando se actualizan las dimensiones físicas de la habitación desde el formulario de Angular.

* **Payload JSON**:
```json
{
  "roomWidth": 10.00,
  "roomLength": 10.00,
  "roomHeight": 2.70,
  "windowCount": 4,
  "windowAreaTotal": 6.00,
  "minisplitCount": 2,
  "purifierCount": 1,
  "extractorCount": 1,
  "recommendedPurifierCadr": 350.00,
  "recommendedExtractorFlow": 420.00
}
```
* **Efecto en el Emulador**: Al recibir este JSON, el emulador destruye la simulación anterior y la reinicializa con los nuevos volúmenes térmicos y tasas de renovación, modificando al instante el ritmo de acumulación de CO2 y fluctuación de temperatura.
