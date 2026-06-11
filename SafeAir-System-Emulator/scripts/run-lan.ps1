$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

function Assert-Java21 {
  $versionOutput = (& java -version 2>&1 | Select-Object -First 1)
  if ($LASTEXITCODE -ne 0 -or -not ($versionOutput -match 'version "21\.|openjdk 21\.')) {
    Write-Error "Este emulador requiere Java 21. Version detectada: $versionOutput`nInstala o activa JDK 21 antes de continuar."
  }
}

Assert-Java21

if (-not $env:SPRING_PROFILES_ACTIVE) { $env:SPRING_PROFILES_ACTIVE = "production,profile1" }
if (-not $env:MQTT_HOST) { $env:MQTT_HOST = "IP_PC_DB_MQTT" }
if (-not $env:MQTT_PORT) { $env:MQTT_PORT = "1883" }
if (-not $env:MQTT_TLS_ENABLED) { $env:MQTT_TLS_ENABLED = "false" }
if (-not $env:MQTT_CONSOLE_LOG_ENABLED) { $env:MQTT_CONSOLE_LOG_ENABLED = "true" }
if (-not $env:SAFEAIR_EMULATOR_IDS) { $env:SAFEAIR_EMULATOR_IDS = "EMU-DEMO-R001,EMU-DEMO-R002,EMU-DEMO-R003" }
if (-not $env:SERVER_PORT) { $env:SERVER_PORT = "8081" }

if ($env:MQTT_HOST -eq "IP_PC_DB_MQTT") {
  Write-Error "MQTT_HOST still uses placeholder IP_PC_DB_MQTT. Set it first, for example: `$env:MQTT_HOST='192.0.2.10'; .\scripts\run-lan.ps1"
}

Write-Host "[SafeAir Emulator] LAN"
Write-Host "  SPRING_PROFILES_ACTIVE=$env:SPRING_PROFILES_ACTIVE"
Write-Host "  MQTT_HOST=$env:MQTT_HOST"
Write-Host "  MQTT_PORT=$env:MQTT_PORT"
Write-Host "  MQTT_TLS_ENABLED=$env:MQTT_TLS_ENABLED"
Write-Host "  MQTT_CONSOLE_LOG_ENABLED=$env:MQTT_CONSOLE_LOG_ENABLED"
Write-Host "  SAFEAIR_EMULATOR_IDS=$env:SAFEAIR_EMULATOR_IDS"
Write-Host "  SERVER_PORT=$env:SERVER_PORT"

mvn spring-boot:run "-Dspring-boot.run.arguments=--server.port=$env:SERVER_PORT"
