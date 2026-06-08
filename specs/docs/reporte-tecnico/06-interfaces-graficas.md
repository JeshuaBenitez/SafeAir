# Interfaces Gráficas de Usuario - SafeAir

Este documento presenta la guía de navegación y la especificación de las interfaces gráficas de la aplicación SafeAir. Se detallan las pantallas principales destinadas al operador final, así como los paneles web auxiliares utilizados por el equipo de desarrollo para tareas de diagnóstico y depuración.

---

## 1. Interfaces del Frontend Angular (Sistema de Usuario Final)

### 1.1 Portal de Login y Doble Factor de Autenticación (2FA OTP)
La pantalla de inicio de sesión solicita el correo electrónico y contraseña del usuario. Tras ingresar credenciales válidas, y si la variable del entorno no omite la validación (`AUTH_SKIP_OTP=false`), el sistema redirige al usuario a la pantalla de verificación OTP. En esta vista, el usuario debe ingresar un código numérico temporal enviado a su correo electrónico institucional para validar su sesión de red.

> **[Marcador de Captura de Evidencia]**
> *Insertar captura del portal de Login y de la vista de ingreso del código OTP enviado por correo.*

### 1.2 Dashboard de Monitoreo de Habitaciones
El panel principal presenta un resumen de indicadores del campus (número total de habitaciones registradas, actuadores activos, metros cuadrados monitoreados y total de ventanas). Debajo, muestra tarjetas individuales para cada aula en las que se detallan las variables en tiempo real (Temperatura, Humedad, CO2, PM2.5), junto con un indicador visual del nivel de alerta y un acceso directo a la consola de control y al historial.

> **[Marcador de Captura de Evidencia]**
> *Insertar captura del Dashboard Principal con múltiples tarjetas de habitaciones en red.*

### 1.3 Panel de Consulta de Histórico de Telemetrías
Permite realizar consultas parametrizadas de sensores en base de datos. El operador selecciona un rango de fechas y horas para graficar interactivamente el comportamiento temporal de las variables del aula, con la capacidad de exportar las lecturas acumuladas a un formato CSV compatible con hojas de cálculo.

> **[Marcador de Captura de Evidencia]**
> *Insertar captura de la gráfica histórica interactiva del aula y el archivo CSV descargado.*

---

## 2. Paneles de Diagnóstico y Depuración del Backend (Herramientas Auxiliares)

> [!IMPORTANT]
> Las interfaces web servidas por el backend bajo el prefijo `/debug` no son vistas del sistema del operador final. Son herramientas de diagnóstico técnico protegidas y restringidas para validación operativa durante la demostración en vivo. Su visualización local en navegadores externos requiere una sesión autenticada con un token JWT válido.

### 2.1 Tablero de Control de Emuladores (`/debug/emulators/html`)
Permite visualizar la sincronización física entre la base de datos PostgreSQL (dimensiones de salones) y el estado en tiempo real que los emuladores Java publican por MQTT. Muestra el estado de conectividad (`online`/`offline`), la última telemetría reportada por memoria y un panel interactivo para el envío manual de comandos de actuadores.

> **[Marcador de Captura de Evidencia]**
> *Insertar captura de la vista /debug/emulators/html mostrando los emuladores activos en red.*

### 2.2 Visor de Logs del Servidor (`/debug/logs/html`)
Muestra en tiempo real la bitácora estructurada de eventos del backend. Permite filtrar y examinar los logs de ingesta de telemetría, errores de conexión de base de datos, envío de correos OTP y las publicaciones de comandos MQTT. Es una herramienta clave para auditar el flujo de datos sin necesidad de abrir una terminal SSH.

> **[Marcador de Captura de Evidencia]**
> *Insertar captura del Visor de Logs en red mostrando las conexiones de red exitosas.*
