# Elementos de Diseño - SafeAir

Este documento presenta una síntesis ejecutiva de los elementos de diseño que componen la solución arquitectónica SafeAir. Define el marco general de integración entre el modelo de datos persistido, la infraestructura de red distribuida, el mapeo de mensajería y la capa de presentación del usuario final.

SafeAir es un sistema de monitoreo, persistencia y control ambiental mediante emuladores, API REST, MQTT y PostgreSQL.

---

## 1. Síntesis de los Componentes de Diseño

La solución SafeAir está estructurada alrededor de cuatro pilares de diseño técnico:

```
┌────────────────────────────────────────────────────────┐
│               SISTEMA DISTRIBUIDO SAFEAIR              │
└──────────────────────────┬─────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │  Modelo de   │  │ Arquitectura │  │ Interfaces   │
 │    Datos     │  │  de Red LAN  │  │   de Usuario │
 └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          ▼
                  ┌──────────────┐
                  │ Tópicos MQTT │
                  └──────────────┘
```

### 1.1 Modelo de Datos Real
El modelo de datos está implementado de forma relacional en PostgreSQL. Proporciona una estructura de base de datos robusta y normalizada gestionada a través del ORM Sequelize. Los modelos físicos registran el ciclo operativo de las aulas, el almacenamiento detallado de lecturas de sensores y el historial de acciones y comandos de actuadores. Adicionalmente, cuenta con un script de compatibilidad (`002-dictionary-compat.sql`) que expone vistas del diccionario de datos requerido por las rúbricas de evaluación sin alterar el esquema relacional nativo del backend.

### 1.2 Arquitectura del Sistema
El sistema se distribuye en una topología local/LAN. Los componentes principales son el Frontend Angular, el Backend API Node.js/Express, el motor PostgreSQL, el intermediario MQTT EMQX y el Emulador Java. El backend actúa como el núcleo orquestador: expone endpoints REST HTTP para la interacción del cliente web, administra la persistencia relacional en la base de datos y se conecta como cliente MQTT publicador/suscriptor para canalizar la comunicación con el emulador.

### 1.3 Interfaces Gráficas de Usuario
La interfaz web del frontend se diseñó con un enfoque responsivo y modular en Angular. El flujo visual guía al operador desde un portal de autenticación seguro protegido con códigos de un solo uso (2FA OTP) hacia un panel operativo de habitaciones. Cuenta con un dashboard híbrido que permite graficar la telemetría en tiempo real o consultar históricos, complementado con controles interactivos para los actuadores y un visualizador directo de logs del sistema.

### 1.4 Tópicos Implementados en MQTT
La mensajería distribuida asíncrona entre el backend y los emuladores se implementa sobre el protocolo MQTT. Se estructuran tópicos dinámicos segmentados por el identificador único de cada emulador (`safeair/{emulatorId}/telemetry` para el envío de datos de sensores, y `safeair/{emulatorId}/actuator-state` para la recepción de comandos). Esto garantiza que los mensajes se enruten de manera exclusiva al dispositivo y espacio correspondiente.

---

## 2. Relación y Sincronización entre Componentes

Los componentes interactúan bajo el siguiente esquema operativo de red:

1. **La Interfaz Gráfica** inicia el flujo al enviar comandos REST de configuración o control.
2. **La Arquitectura del Backend** recibe y procesa la petición REST, validando el token JWT del operador.
3. **El Modelo de Datos** registra de inmediato la acción o configuración en PostgreSQL.
4. **El Backend** publica el payload formateado a través de los **Tópicos MQTT** en el broker EMQX.
5. **El Emulador** (suscrito al tópico de control) intercepta el comando, modifica la ecuación de simulación física en memoria y publica las nuevas lecturas de sensores a través de los **Tópicos MQTT** de telemetría hacia el Backend para su persistencia en el **Modelo de Datos** y graficado inmediato en la **Interfaz Gráfica**.
