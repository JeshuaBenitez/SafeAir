import type { Request, Response } from "express";

type ActuatorType = "minisplit" | "purifier" | "extractor";
interface ActuatorUnitState {
  deviceIndex: number;
  isOn: boolean | null;
  targetTemperature?: number | null;
}

type DeviceUpdate = Partial<Record<ActuatorType, ActuatorUnitState | ActuatorUnitState[]>>;

/**
 * In-memory store for emulator states
 * Keeps track of the latest state reported by each emulator
 */
interface EmulatorState {
  emulatorId: string;
  roomId: string | null;
  connected: boolean;
  lastSeen: string;
  metrics: {
    temperature: number | null;
    humidity: number | null;
    co2: number | null;
    pm25: number | null;
  };
  devices: {
    minisplit: ActuatorUnitState[];
    purifier: ActuatorUnitState[];
    extractor: ActuatorUnitState[];
  };
}

const emulatorStates = new Map<string, EmulatorState>();

/**
 * Update emulator state when telemetry is received
 */
export function updateEmulatorState(
  emulatorId: string,
  roomId: string | null,
  metrics: { temperature?: number; humidity?: number; co2?: number; pm25?: number },
  devices?: DeviceUpdate
): void {
  const existing = emulatorStates.get(emulatorId) || {
    emulatorId,
    roomId,
    connected: true,
    lastSeen: new Date().toISOString(),
    metrics: { temperature: null, humidity: null, co2: null, pm25: null },
    devices: {
      minisplit: [],
      purifier: [],
      extractor: [],
    },
  };

  existing.roomId = roomId || existing.roomId;
  existing.connected = true;
  existing.lastSeen = new Date().toISOString();
  
  if (metrics.temperature !== undefined) existing.metrics.temperature = metrics.temperature;
  if (metrics.humidity !== undefined) existing.metrics.humidity = metrics.humidity;
  if (metrics.co2 !== undefined) existing.metrics.co2 = metrics.co2;
  if (metrics.pm25 !== undefined) existing.metrics.pm25 = metrics.pm25;

  if (devices) {
    mergeDeviceUpdates(existing.devices, "minisplit", devices.minisplit);
    mergeDeviceUpdates(existing.devices, "purifier", devices.purifier);
    mergeDeviceUpdates(existing.devices, "extractor", devices.extractor);
  }

  emulatorStates.set(emulatorId, existing);
}

function mergeDeviceUpdates(
  currentDevices: EmulatorState["devices"],
  type: ActuatorType,
  updates: ActuatorUnitState | ActuatorUnitState[] | undefined
): void {
  if (!updates) {
    return;
  }

  const normalized = Array.isArray(updates) ? updates : [updates];
  for (const update of normalized) {
    const deviceIndex = normalizeDeviceIndex(update.deviceIndex);
    const existing = currentDevices[type].find((unit) => unit.deviceIndex === deviceIndex);

    if (existing) {
      existing.isOn = update.isOn ?? existing.isOn;
      existing.targetTemperature = update.targetTemperature ?? existing.targetTemperature ?? null;
      continue;
    }

    currentDevices[type].push({
      deviceIndex,
      isOn: update.isOn ?? null,
      targetTemperature: update.targetTemperature ?? null
    });
  }

  currentDevices[type].sort((a, b) => a.deviceIndex - b.deviceIndex);
}

function normalizeDeviceIndex(value: unknown): number {
  const parsed = Number(value ?? 1);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 3 ? parsed : 1;
}

/**
 * Get all emulator states
 */
export function getEmulatorStates(): EmulatorState[] {
  return Array.from(emulatorStates.values());
}

/**
 * Get a specific emulator state
 */
export function getEmulatorState(emulatorId: string): EmulatorState | undefined {
  return emulatorStates.get(emulatorId);
}

/**
 * In-memory circular buffer for system logs
 * Stores last 1000 log entries for real-time monitoring
 */
const LOG_BUFFER_SIZE = 1000;
const logBuffer: LogEntry[] = [];
let logIndex = 0;

export interface LogEntry {
  id: number;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  source: "api" | "mqtt-received" | "mqtt-published" | "frontend" | "emulator" | "postgres" | "system";
  event: string;
  message: string;
  details?: Record<string, unknown>;
  roomId?: string;
  emulatorId?: string;
}

let logIdCounter = 0;

/**
 * Add a log entry to the circular buffer
 */
export function addLog(entry: Omit<LogEntry, "id">): void {
  const fullEntry: LogEntry = {
    ...entry,
    id: logIdCounter++,
  };

  if (logBuffer.length < LOG_BUFFER_SIZE) {
    logBuffer.push(fullEntry);
  } else {
    logBuffer[logIndex] = fullEntry;
  }

  logIndex = (logIndex + 1) % LOG_BUFFER_SIZE;
}

/**
 * Helper functions for different log sources
 */
export function logApi(endpoint: string, method: string, statusCode?: number): void {
  addLog({
    timestamp: new Date().toISOString(),
    level: statusCode && statusCode >= 400 ? "error" : "info",
    source: "api",
    event: "api-request",
    message: `${method} ${endpoint}${statusCode ? ` -> ${statusCode}` : ""}`,
    details: { endpoint, method, statusCode },
  });
}

export function logMqttReceived(topic: string, payload: unknown, emulatorId?: string): void {
  addLog({
    timestamp: new Date().toISOString(),
    level: "info",
    source: "mqtt-received",
    event: "mqtt-message",
    message: `Received from ${topic}`,
    details: { topic, payload },
    emulatorId,
  });
}

export function logMqttPublished(topic: string, payload: unknown, emulatorId?: string): void {
  addLog({
    timestamp: new Date().toISOString(),
    level: "info",
    source: "mqtt-published",
    event: "mqtt-message",
    message: `Published to ${topic}`,
    details: { topic, payload },
    emulatorId,
  });
}

export function logFrontend(action: string, details?: Record<string, unknown>): void {
  addLog({
    timestamp: new Date().toISOString(),
    level: "info",
    source: "frontend",
    event: "frontend-action",
    message: action,
    details,
  });
}

export function logEmulator(event: string, emulatorId: string, details?: Record<string, unknown>): void {
  addLog({
    timestamp: new Date().toISOString(),
    level: "info",
    source: "emulator",
    event: "emulator-event",
    message: event,
    details,
    emulatorId,
  });
}

export function logPostgres(operation: string, table: string, details?: Record<string, unknown>): void {
  addLog({
    timestamp: new Date().toISOString(),
    level: "debug",
    source: "postgres",
    event: "postgres-operation",
    message: `${operation} on ${table}`,
    details,
  });
}

export function logSystem(event: string, details?: Record<string, unknown>): void {
  addLog({
    timestamp: new Date().toISOString(),
    level: "info",
    source: "system",
    event: "system-event",
    message: event,
    details,
  });
}

export function logError(source: string, event: string, error: unknown): void {
  addLog({
    timestamp: new Date().toISOString(),
    level: "error",
    source: source as LogEntry["source"],
    event: event,
    message: error instanceof Error ? error.message : String(error),
    details: { error: error instanceof Error ? error.stack : String(error) },
  });
}

/**
 * Get recent logs with optional filtering
 */
export function getLogs(options?: {
  level?: LogEntry["level"];
  source?: LogEntry["source"];
  limit?: number;
  since?: string;
}): LogEntry[] {
  let filtered = [...logBuffer].filter((log) => log.id !== undefined);

  if (options?.level) {
    filtered = filtered.filter((log) => log.level === options.level);
  }

  if (options?.source) {
    filtered = filtered.filter((log) => log.source === options.source);
  }

  if (options?.since) {
    const sinceDate = new Date(options.since);
    filtered = filtered.filter((log) => new Date(log.timestamp) >= sinceDate);
  }

  // Sort by timestamp descending (most recent first)
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Debug Controller - Serves log view page and log API
 */
export class DebugController {
  /**
   * GET /debug/logs - Returns logs as JSON
   */
  async getLogs(req: Request, res: Response): Promise<void> {
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as LogEntry["level"] | undefined;
    const source = req.query.source as LogEntry["source"] | undefined;
    const since = req.query.since as string | undefined;

    const logs = getLogs({ level, source, limit, since });

    res.status(200).json({
      count: logs.length,
      logs,
    });
  }

  /**
   * GET /debug/logs/html - Returns logs as HTML page for viewing
   */
  async getLogsHtml(req: Request, res: Response): Promise<void> {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = getLogs({ limit });

    const html = generateLogsHtml(logs);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  }

  /**
   * GET /debug/status - Returns system status
   */
  async getStatus(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      logsInBuffer: logBuffer.filter((l) => l.id !== undefined).length,
      logBufferSize: LOG_BUFFER_SIZE,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Generate HTML page for log visualization
 */
function localNow(): string {
  return new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
}

function formatLocalTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
  } catch {
    return isoString;
  }
}

function generateLogsHtml(logs: LogEntry[]): string {
  const logRows = logs
    .map(
      (log) => `
    <tr class="log-${log.level}">
      <td>${formatLocalTime(log.timestamp)}</td>
      <td><span class="badge badge-${log.level}">${log.level.toUpperCase()}</span></td>
      <td><span class="badge badge-source">${log.source}</span></td>
      <td>${log.event}</td>
      <td>${log.message}</td>
      <td>${log.emulatorId || "-"}</td>
    </tr>
  `
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeAir Debug Logs</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; background: #0d1117; color: #c9d1d9; }
    h1 { color: #58a6ff; margin-bottom: 4px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .header-left { flex: 1; }
    .header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .nav { margin-bottom: 20px; }
    .nav a { color: #58a6ff; margin-right: 20px; text-decoration: none; font-size: 14px; }
    .nav a:hover { text-decoration: underline; }
    .refrescar { padding: 8px 16px; background: #238636; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .auto-refresh { font-size: 13px; color: #8b949e; }
    .auto-refresh input { accent-color: #238636; }
    .summary { display: flex; gap: 20px; margin-bottom: 20px; font-size: 13px; color: #8b949e; flex-wrap: wrap; }
    .global-notice { margin: -6px 0 18px; padding: 12px 14px; border: 1px solid #9e6a03; border-radius: 8px; background: rgba(158, 106, 3, 0.16); color: #f0d08a; font-size: 13px; line-height: 1.45; }
    .table-wrap { background: #161b22; border-radius: 8px; overflow: hidden; border: 1px solid #30363d; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #21262d; padding: 12px; text-align: left; font-weight: 600; color: #8b949e; }
    td { padding: 10px 12px; border-bottom: 1px solid #30363d; font-size: 13px; }
    tr:hover { background: #1f242c; }
    .badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .badge-info { background: #1f6feb; color: white; }
    .badge-warn { background: #9e6a03; color: white; }
    .badge-error { background: #da3633; color: white; }
    .badge-debug { background: #6e7681; color: white; }
    .badge-source { background: #30363d; color: #c9d1d9; }
    .log-info td { border-left: 3px solid #58a6ff; }
    .log-warn td { border-left: 3px solid #d29922; }
    .log-error td { border-left: 3px solid #f85149; }
    .log-debug td { border-left: 3px solid #8b949e; }
    .empty { text-align: center; padding: 30px; color: #6e7681; }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/debug/logs/html">Ver Logs</a>
    <a href="/debug/emulators/html">Dashboard Emuladores</a>
    <a href="/debug/status">Estado Sistema</a>
  </div>
  <div class="header">
    <div class="header-left">
      <h1>SafeAir Debug Logs Globales</h1>
      <div class="summary">
        <span>Total: ${logs.length} logs</span>
        <span>Actualizado: <span id="clock">${localNow()}</span></span>
        <span>Zona: América/México (CDMX)</span>
      </div>
    </div>
    <div class="header-right">
      <label class="auto-refresh">
        <input type="checkbox" id="autoRefresh" checked> Auto-refresh cada 5s
      </label>
      <button class="refrescar" id="refreshBtn">Refresh</button>
    </div>
  </div>
  <div class="global-notice">
    Esta vista muestra logs globales del sistema, incluyendo telemetría de emuladores como EMU-0001 y EMU-0002. No implica que esos eventos pertenezcan al usuario o room autenticado en el frontend.
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Timestamp (CDMX)</th>
          <th>Nivel</th>
          <th>Origen</th>
          <th>Evento</th>
          <th>Mensaje</th>
          <th>Emulator</th>
        </tr>
      </thead>
      <tbody>
        ${logs.length > 0 ? logRows : '<tr><td colspan="6" class="empty">Sin logs disponibles. Los eventos aparecerán aquí en tiempo real.</td></tr>'}
      </tbody>
    </table>
  </div>
  <script src="/debug/assets/debug-logs.js"></script>
</body>
</html>`;
}
