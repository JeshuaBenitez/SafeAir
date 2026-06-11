$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

function Assert-Java21 {
  $versionOutput = (& java -version 2>&1 | Select-Object -First 1)
  if ($LASTEXITCODE -ne 0 -or -not ($versionOutput -match 'version "21\.|openjdk 21\.')) {
    Write-Error "Este emulador requiere Java 21. Version detectada: $versionOutput`nInstala o activa JDK 21 antes de continuar."
  }
}

Assert-Java21

function Import-EnvLocal {
  $envFile = Join-Path (Get-Location) ".env.local"
  if (-not (Test-Path $envFile)) { return }

  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    if ($line.StartsWith("export ")) { $line = $line.Substring(7).Trim() }

    $parts = $line.Split("=", 2)
    if ($parts.Count -ne 2) { return }

    $key = $parts[0].Trim()
    $value = $parts[1]
    if (-not [Environment]::GetEnvironmentVariable($key, "Process")) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

Import-EnvLocal

if (-not $env:SPRING_PROFILES_ACTIVE) { $env:SPRING_PROFILES_ACTIVE = "production,profile1" }
if (-not $env:MQTT_HOST) { $env:MQTT_HOST = "IP_PC_DB_MQTT" }
if (-not $env:MQTT_PORT) { $env:MQTT_PORT = "1883" }
if (-not $env:MQTT_TLS_ENABLED) { $env:MQTT_TLS_ENABLED = "false" }
if (-not $env:MQTT_CONSOLE_LOG_ENABLED) { $env:MQTT_CONSOLE_LOG_ENABLED = "false" }
if (-not $env:SAFEAIR_CLI_SUPPRESS_TELEMETRY_OUTPUT) { $env:SAFEAIR_CLI_SUPPRESS_TELEMETRY_OUTPUT = "true" }
if (-not $env:SAFEAIR_MQTT_LOG_LEVEL) { $env:SAFEAIR_MQTT_LOG_LEVEL = "WARN" }
if (-not $env:SPRING_DEBUG) { $env:SPRING_DEBUG = "false" }
if (-not $env:SAFEAIR_EMULATOR_IDS) { $env:SAFEAIR_EMULATOR_IDS = "EMU-U001-R001,EMU-U001-R002,EMU-U001-R003" }
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
Write-Host "  SAFEAIR_CLI_SUPPRESS_TELEMETRY_OUTPUT=$env:SAFEAIR_CLI_SUPPRESS_TELEMETRY_OUTPUT"
Write-Host "  SAFEAIR_MQTT_LOG_LEVEL=$env:SAFEAIR_MQTT_LOG_LEVEL"
Write-Host "  SPRING_DEBUG=$env:SPRING_DEBUG"
Write-Host "  SAFEAIR_EMULATOR_IDS=$env:SAFEAIR_EMULATOR_IDS"
Write-Host "  SERVER_PORT=$env:SERVER_PORT"

mvn spring-boot:run "-Dspring-boot.run.arguments=--server.port=$env:SERVER_PORT --debug=$env:SPRING_DEBUG"
