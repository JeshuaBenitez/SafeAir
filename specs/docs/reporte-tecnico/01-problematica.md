# Descripción de la Problemática - SafeAir

## 1. El Problema de la Calidad del Aire y Confort Térmico en Aulas

El monitoreo de variables ambientales en espacios educativos y aulas de clase universitarias ha tomado una relevancia crítica. Los recintos cerrados que albergan una densidad alta de estudiantes durante periodos prolongados son susceptibles a la acumulación rápida de contaminantes y a variaciones extremas en las condiciones de confort térmico.

La falta de una ventilación adecuada y el mal funcionamiento de los equipos de climatización derivan en dos problemas principales:

* **Efectos en la Salud y Rendimiento Cognitivo**: La concentración elevada de Dióxido de Carbono (CO2) y de partículas finas suspendidas (PM2.5) está directamente correlacionada con la aparición de fatiga, dolores de cabeza, somnolencia, pérdida de concentración y disminución en el rendimiento escolar de alumnos y docentes.
* **Seguridad Sanitaria**: Los espacios con bajas tasas de renovación de aire y acumulación de CO2 incrementan el riesgo de transmisión aérea de patógenos y virus respiratorios.

---

## 2. Variables Monitoreadas por el Sistema

SafeAir aborda esta problemática mediante la lectura sistemática de las siguientes variables críticas:

* **Temperatura**: Medida en grados Celsius (°C). Afecta el confort térmico directo. Temperaturas fuera del rango idóneo (21°C - 25°C) degradan la atención y aumentan el estrés térmico.
* **Humedad**: Medida en porcentaje relativo (%). Humedades muy bajas secan las mucosas respiratorias facilitando infecciones, mientras que humedades altas favorecen el crecimiento de hongos y bacterias.
* **Dióxido de Carbono (CO2)**: Medido en partes por millón (ppm). Actúa como el principal indicador indirecto de la tasa de ventilación y renovación de aire en un aula. Niveles por encima de 1000 ppm sugieren la necesidad inmediata de ventilación.
* **Partículas Finas en Suspensión (PM2.5)**: Medidas en microgramos por metro cúbico (μg/m³). Estas partículas finas de polvo, polen o humo pueden penetrar profundamente en los pulmones, representando un riesgo respiratorio crónico a largo plazo.
* **Estado de Dispositivos**: Estado operativo (encendido/apagado, temperatura objetivo) de minisplits, extractores y purificadores instalados.

---

## 3. Justificación del Diseño Tecnológico

### ¿Por qué se usan Emuladores?
Desarrollar y probar sistemas IoT físicos en entornos académicos presenta limitaciones logísticas y económicas, como el costo de sensores, actuadores y cableado para cada alumno. El uso de un emulador de hardware permite simular de forma realista el comportamiento térmico y de calidad del aire del aula. El emulador modela matemáticamente cómo varía la temperatura o el CO2 cuando interactúan factores como el número de alumnos, ventanas abiertas y el encendido de extractores o acondicionadores de aire, permitiendo probar la lógica de control del backend en escenarios extremos sin necesidad de hardware real.

### ¿Por qué se usa Comunicación en Red y MQTT?
Los sistemas distribuidos requieren canales eficientes para el transporte de mensajes. El protocolo HTTP tradicional (modelo cliente-servidor por petición/respuesta) no es eficiente para el envío constante de telemetría desde decenas de dispositivos, ya que añade sobrecarga en las cabeceras y no soporta de forma nativa la comunicación asíncrona bidireccional. 

Se utiliza **MQTT (Message Queuing Telemetry Transport)** operado sobre el broker **EMQX** por las siguientes razones:
* **Protocolo Ligero**: Su bajo consumo de ancho de banda lo hace ideal para redes inalámbricas y dispositivos con recursos limitados.
* **Patrón Publicación/Suscripción**: Desacopla los emisores (emuladores) de los receptores (API backend), facilitando que múltiples componentes lean o publiquen eventos de forma independiente.
* **Comunicación Bidireccional Asíncrona**: Permite que el emulador publique telemetría y, al mismo tiempo, esté suscrito a tópicos de comandos para reaccionar al instante cuando el usuario encienda un actuador desde la aplicación web.

### ¿Por qué se Persisten los Datos Históricos?
El análisis en tiempo real es vital para alertas instantáneas, pero insuficiente para la toma de decisiones estratégicas. La persistencia de datos históricos en una base de datos relacional (PostgreSQL) permite almacenar el comportamiento a largo plazo de las aulas. Esto facilita auditorías energéticas, identificación de patrones de uso del espacio y la validación de si las políticas de ventilación del campus están siendo efectivas.

### ¿Qué Valor Aportan los Reportes?
Los reportes históricos estructurados consolidan las lecturas de telemetría y las acciones de control ejecutadas. Ofrecen a las autoridades universitarias y administradores de mantenimiento del campus evidencia cuantitativa para:
1. Programar mantenimiento preventivo de filtros en purificadores y extractores.
2. Identificar cuáles aulas presentan deficiencias estructurales de ventilación (por ejemplo, ventanas suficientes para el aforo promedio).
3. Exportar datos en formatos estándar (CSV) para análisis estadísticos externos o auditorías de cumplimiento de normas de salud ocupacional.
