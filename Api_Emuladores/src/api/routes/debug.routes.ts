import type { Request, Response } from "express";
import { Router } from "express";
import {
  DebugController,
  addLog,
  getEmulatorStates,
  getLogSnapshot,
  getLogsAfterId,
  subscribeDebugEvents
} from "../../application/services/debug-logs.service";
import { container } from "../../application/container";
import { EmulatorRepository } from "../../infrastructure/repositories/emulator.repository";
import { verifyToken } from "../../shared/security/jwt";

const debugController = new DebugController();
const emulatorRepository = new EmulatorRepository();

export const debugRouter = Router();

// ── Helpers ─────────────────────────────────────────────────────────────────

function toLocalTime(isoString: string | undefined): string {
  if (!isoString) return "N/A";
  try {
    return new Date(isoString).toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
  } catch {
    return isoString;
  }
}

function localNow(): string {
  return new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
}

function setNoStoreHeaders(res: Response): void {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  res.removeHeader("ETag");
}

/** Round number to fixed decimals for display only */
function fmt(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined) return "—";
  return Number(value.toFixed(decimals)).toString();
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractDebugToken(req: Request): string | null {
  const header = req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    return header.replace("Bearer ", "").trim();
  }

  return null;
}

function getDebugAuth(req: Request): { userId: string; role: string } | null {
  const token = extractDebugToken(req);
  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken(token);
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

function deviceDisplay(isOn: boolean | null | undefined, targetTemp: number | null | undefined, label: string, hasTemp: boolean): string {
  if (isOn === null || isOn === undefined) return `<span class="device-badge unknown">${label}: N/A</span>`;
  const stateClass = isOn ? "on" : "off";
  const stateLabel = isOn ? "ON" : "OFF";
  const tempStr = hasTemp && targetTemp !== null && targetTemp !== undefined ? ` (${targetTemp}°C)` : "";
  return `<span class="device-badge ${stateClass}">${label}: ${stateLabel}${tempStr}</span>`;
}

// ── Navigation links constant (used by all HTML pages) ────────────────────

// ── Routes ──────────────────────────────────────────────────────────────────

// Get logs as JSON
debugRouter.get("/logs", (req, res, next) => {
  setNoStoreHeaders(res);
  debugController.getLogs(req, res).catch(next);
});

// Get logs as HTML
debugRouter.get("/logs/html", (req, res, next) => {
  setNoStoreHeaders(res);
  debugController.getLogsHtml(req, res).catch(next);
});

debugRouter.get("/events/logs", (req, res) => {
  openSseStream(req, res, "logs");
});

// Get system status
debugRouter.get("/status", (req, res, next) => {
  setNoStoreHeaders(res);
  debugController.getStatus(req, res).catch(next);
});

debugRouter.get("/events/emulators", (req, res) => {
  openSseStream(req, res, "emulators");
});

debugRouter.post("/provisioning/replay", async (req, res) => {
  setNoStoreHeaders(res);
  const auth = getDebugAuth(req);
  if (!auth) {
    res.status(401).json({ message: "JWT válido requerido." });
    return;
  }
  if (auth.role !== "admin") {
    res.status(403).json({ message: "Solo un administrador puede republicar provisionamiento." });
    return;
  }

  const summary = await container.emulatorProvisioningService.replayRegistered();
  res.status(summary.failed > 0 ? 207 : 200).json(summary);
});

function openSseStream(req: Request, res: Response, eventType: "logs" | "emulators"): void {
  setNoStoreHeaders(res);
  if (eventType === "emulators" && !getDebugAuth(req)) {
    res.status(401).json({ message: "JWT válido requerido." });
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (event: string, data: unknown, id?: number): void => {
    if (id !== undefined) {
      res.write(`id: ${id}\n`);
    }
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send("connected", { stream: eventType, timestamp: new Date().toISOString() });
  if (eventType === "logs") {
    const lastEventId = Number(req.header("last-event-id") ?? req.header("Last-Event-ID"));
    const logs = Number.isFinite(lastEventId) && lastEventId >= 0
      ? getLogsAfterId(lastEventId)
      : getLogSnapshot();
    send("snapshot", { stream: eventType, logs, timestamp: new Date().toISOString() });
  } else {
    send("snapshot", { stream: eventType, emulators: getEmulatorStates(), timestamp: new Date().toISOString() });
  }

  const unsubscribe = subscribeDebugEvents((event) => {
    if (event.stream === eventType) {
      send(event.event, { stream: event.stream, timestamp: new Date().toISOString(), payload: event.payload }, event.id);
    }
  });

  addLog({
    timestamp: new Date().toISOString(),
    level: "info",
    source: "api",
    event: "debug.client.connected",
    message: `Debug ${eventType} SSE client connected`,
    details: { stream: eventType, ip: req.ip, userAgent: req.get("user-agent") ?? null }
  });

  const heartbeat = setInterval(() => {
    send("heartbeat", { stream: eventType, ts: new Date().toISOString() });
  }, 10000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "debug.client.disconnected",
      message: `Debug ${eventType} SSE client disconnected`,
      details: { stream: eventType, ip: req.ip }
    });
    res.end();
  });
}

function buildDebugEmulatorView(req: Request) {
  const auth = getDebugAuth(req);
  const explicitGlobal = req.query.scope === "global" || req.query.includePool === "true";
  const global = Boolean(auth && auth.role === "admin" && explicitGlobal);
  return { userId: auth?.userId ?? null, role: auth?.role ?? null, global };
}

async function getDebugEmulatorsForRequest(req: Request) {
  const { userId, role, global } = buildDebugEmulatorView(req);
  if (!userId) {
    return { userId, role, global, emulatorsFromDb: null };
  }

  const emulatorsFromDb = global
    ? await emulatorRepository.findAllGlobalDebug(userId)
    : await emulatorRepository.findAllWithRoomDetails(userId);

  return { userId, role, global, emulatorsFromDb };
}

type DebugLatestMeasurement = {
  temperature: number;
  humidity: number;
  co2: number;
  pm25: number;
  measuredAt: string | null;
  receivedAt?: string | null;
  source?: string | null;
};

function toIsoString(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function normalizeLatestMeasurement(value: unknown): DebugLatestMeasurement | null {
  const raw = value && typeof value === "object" && "get" in value && typeof (value as { get?: unknown }).get === "function"
    ? ((value as { get(options?: unknown): unknown }).get({ plain: true }) as Record<string, unknown>)
    : value as Record<string, unknown> | null;

  if (!raw) {
    return null;
  }

  const metrics = (raw.metrics && typeof raw.metrics === "object"
    ? raw.metrics
    : raw) as Record<string, unknown>;

  const temperature = Number(metrics.temperature);
  const humidity = Number(metrics.humidity);
  const co2 = Number(metrics.co2);
  const pm25 = Number(metrics.pm25);

  if (![temperature, humidity, co2, pm25].every(Number.isFinite)) {
    return null;
  }

  return {
    temperature,
    humidity,
    co2,
    pm25,
    measuredAt: toIsoString(raw.measuredAt),
    receivedAt: toIsoString(raw.receivedAt),
    source: typeof raw.source === "string" ? raw.source : null
  };
}

function normalizeMemoryMetrics(memoryState: ReturnType<typeof getEmulatorStates>[number] | undefined): DebugLatestMeasurement | null {
  if (!memoryState) {
    return null;
  }

  const latest = normalizeLatestMeasurement({
    ...memoryState.metrics,
    measuredAt: memoryState.lastSeen
  });

  return latest;
}

async function buildDebugEmulatorPayload(
  emuDb: NonNullable<Awaited<ReturnType<typeof getDebugEmulatorsForRequest>>["emulatorsFromDb"]>[number],
  memoryMap: Map<string, ReturnType<typeof getEmulatorStates>[number]>
) {
  const memoryState = emuDb.emulatorExternalId ? memoryMap.get(emuDb.emulatorExternalId) : undefined;
  const actuatorState = emuDb.assignmentStatus === "assigned" && emuDb.roomId
    ? await container.metricsQueryService.actuatorState(emuDb.roomId) as { actuators?: unknown; metrics?: unknown; measuredAt?: unknown; receivedAt?: unknown }
    : null;
  const dbMeasurement = normalizeLatestMeasurement(actuatorState);
  const memoryMeasurement = normalizeMemoryMetrics(memoryState);
  const latestMeasurement = dbMeasurement ?? memoryMeasurement;

  return {
    emulatorId: emuDb.emulatorExternalId,
    roomId: emuDb.roomId,
    roomName: emuDb.roomName,
    status: emuDb.status,
    roomArea: emuDb.roomArea,
    windowCount: emuDb.windowCount,
    minisplitCount: emuDb.minisplitCount,
    purifierCount: emuDb.purifierCount,
    extractorCount: emuDb.extractorCount,
    minisplitSize: emuDb.minisplitSize,
    purifierSize: emuDb.purifierSize,
    extractorSize: emuDb.extractorSize,
    hasEmulator: emuDb.hasEmulator,
    ownedByUser: emuDb.ownedByUser,
    assignmentStatus: emuDb.assignmentStatus,
    assignable: emuDb.assignmentStatus === "free" && emuDb.status === "online",
    connected: emuDb.assignmentStatus === "assigned" ? (memoryState?.connected ?? (emuDb.status === "online")) : false,
    lastSeen: latestMeasurement?.measuredAt ?? memoryState?.lastSeen ?? null,
    latestMeasurement: emuDb.assignmentStatus === "assigned" ? latestMeasurement : null,
    metrics: emuDb.assignmentStatus === "assigned" && latestMeasurement
      ? {
          temperature: latestMeasurement.temperature,
          humidity: latestMeasurement.humidity,
          co2: latestMeasurement.co2,
          pm25: latestMeasurement.pm25
        }
      : null,
    devices: emuDb.assignmentStatus === "assigned" ? (actuatorState?.actuators ?? memoryState?.devices ?? null) : null
  };
}

// Get emulators dashboard as JSON
debugRouter.get("/emulators", async (req, res) => {
  setNoStoreHeaders(res);
  const { userId, role, global, emulatorsFromDb } = await getDebugEmulatorsForRequest(req);
  if (!userId) {
    res.status(401).json({
      count: 0,
      emulators: [],
      message: "JWT requerido para ver rooms/emuladores del usuario actual."
    });
    return;
  }

  const emulatorsFromMemory = getEmulatorStates();
  const memoryMap = new Map(emulatorsFromMemory.map(e => [e.emulatorId, e]));
  const emulators = await Promise.all((emulatorsFromDb ?? []).map(async (emuDb) => {
    return buildDebugEmulatorPayload(emuDb, memoryMap);
  }));

  res.status(200).json({ count: emulators.length, mode: global ? "global-admin" : "user", role, emulators });
});

// Get emulators dashboard as HTML - combines PostgreSQL config + memory telemetry
debugRouter.get("/emulators/html", async (req, res) => {
  try {
    setNoStoreHeaders(res);
    const { userId, global, emulatorsFromDb } = await getDebugEmulatorsForRequest(req);

    // Get real-time state from memory (telemetry)
    const emulatorsFromMemory = getEmulatorStates();
    const memoryMap = new Map(emulatorsFromMemory.map(e => [e.emulatorId, e]));

    // Get user-owned rooms and their emulator assignment from PostgreSQL
    const dbRows = emulatorsFromDb ?? [];

    // Combine both sources
    const combinedEmulators = await Promise.all(dbRows.map(async (emuDb) => {
      return buildDebugEmulatorPayload(emuDb, memoryMap);
    }));

    const html = generateEmulatorsHtml(combinedEmulators, { authRequired: !userId, global });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    console.error('Error generating emulators dashboard:', err);
    res.status(500).send('Error loading dashboard');
  }
});

// ── Emulators dashboard HTML generator ──────────────────────────────────────

function generateEmulatorsHtml(emulators: any[], options: { authRequired: boolean; global: boolean }): string {
  const emulatorCards = emulators.map((emu, index) => {
    const cardId = emu.emulatorId || `room-${emu.roomId || index}`;
    const safeCardId = escapeHtml(cardId);
    const assignmentStatus = emu.assignmentStatus || (emu.hasEmulator ? "assigned" : "room-without-emulator");
    const isAssigned = assignmentStatus === "assigned" && emu.ownedByUser && emu.roomId;
    const isFreeAssignable = assignmentStatus === "free" && emu.status === "online";
    const connClass = assignmentStatus === "free"
      ? (isFreeAssignable ? "available" : "offline")
      : assignmentStatus === "room-without-emulator"
        ? "unassigned"
        : (emu.connected ? "connected" : "disconnected");
    const connLabel = assignmentStatus === "free"
      ? (isFreeAssignable ? "Libre / asignable" : `Libre / ${emu.status || "offline"} / no operativo`)
      : assignmentStatus === "room-without-emulator"
        ? "Sin emulador asignado"
        : (emu.connected ? "Conectado" : "Desconectado");
    const lastSeen = toLocalTime(emu.lastSeen);
    const hasMetrics = Boolean(isAssigned && emu.metrics);
    const controlsDisabled = !isAssigned;
    const disabledAttr = controlsDisabled ? "disabled" : "";
    const controlsClass = controlsDisabled ? " controls-section--disabled" : "";
    const controlHint = controlsDisabled
      ? `<div class="control-hint">${assignmentStatus === "free"
        ? (isFreeAssignable
          ? "Emulador libre y online: se asignará automáticamente a una nueva room que lo requiera."
          : "Emulador libre pero no operativo: no se asignará hasta que esté online.")
        : "Sin emulador asignado: el control manual queda deshabilitado para evitar comandos a rooms inválidos."}</div>`
      : "";

    const temp = fmt(emu.metrics?.temperature, 2);
    const humidity = fmt(emu.metrics?.humidity, 2);
    const co2 = fmt(emu.metrics?.co2, 2);
    const pm25 = fmt(emu.metrics?.pm25, 2);
    
    // Room info from PostgreSQL
    const roomName = emu.roomName || emu.roomId || "Sin room válido";
    const roomInfo = emu.roomName && emu.roomId ? `${roomName} (ID: ${emu.roomId.substring(0, 8)}...)` : (emu.roomId ? `ID: ${emu.roomId.substring(0, 8)}...` : "No asignado a ninguna habitación");
    const emulatorLabel = emu.emulatorId || "Sin emulador asignado";
    const primaryTitle = isAssigned || assignmentStatus === "room-without-emulator"
      ? roomName
      : emulatorLabel;
    const secondaryTitle = isAssigned
      ? `Emulador: ${emulatorLabel}`
      : assignmentStatus === "room-without-emulator"
        ? "Sin emulador asignado"
        : "Libre / no asignado";

    const unitList = (type: "minisplit" | "purifier" | "extractor", count: number) => {
      const reported = Array.isArray(emu.devices?.[type]) ? emu.devices[type] : [];
      const byIndex = new Map(reported.map((unit: any) => [Number(unit.deviceIndex ?? 1), unit]));
      return Array.from({ length: count }, (_, unitIndex) => byIndex.get(unitIndex + 1) ?? {
        deviceType: type,
        deviceIndex: unitIndex + 1,
        isOn: null,
        targetTemperature: null
      });
    };

    const miniCount = Number(emu.minisplitCount ?? 0);
    const purCount = Number(emu.purifierCount ?? 0);
    const extCount = Number(emu.extractorCount ?? 0);
    const minisplitUnits = unitList("minisplit", miniCount);
    const purifierUnits = unitList("purifier", purCount);
    const extractorUnits = unitList("extractor", extCount);

    const miniBadge = isAssigned
      ? minisplitUnits.map((unit: any) => deviceDisplay(unit.isOn, unit.targetTemperature, `Minisplit Unidad ${unit.deviceIndex}`, true)).join(" ")
      : `<span class="device-badge unknown">Minisplit (${miniCount}): N/A</span>`;
    const purBadge = isAssigned
      ? purifierUnits.map((unit: any) => deviceDisplay(unit.isOn, null, `Purificador Unidad ${unit.deviceIndex}`, false)).join(" ")
      : `<span class="device-badge unknown">Purificador (${purCount}): N/A</span>`;
    const extBadge = isAssigned
      ? extractorUnits.map((unit: any) => deviceDisplay(unit.isOn, null, `Extractor Unidad ${unit.deviceIndex}`, false)).join(" ")
      : `<span class="device-badge unknown">Extractor (${extCount}): N/A</span>`;

    const controlGroup = (
      type: "minisplit" | "purifier" | "extractor",
      label: string,
      units: any[],
      supportsTemperature: boolean
    ) => units.map((unit) => {
      const isOn = unit.isOn === true;
      const isOff = unit.isOn === false;
      return `
        <div class="control-group">
          <span class="control-label">${label} Unidad ${unit.deviceIndex}</span>
          <div class="btn-group">
            <button class="btn-control btn-on ${isOn ? "is-active" : ""}" data-device="${type}" data-device-index="${unit.deviceIndex}" data-action="turn_on" data-value="true" ${disabledAttr}>ON</button>
            <button class="btn-control btn-off ${isOff ? "is-active" : ""}" data-device="${type}" data-device-index="${unit.deviceIndex}" data-action="turn_off" data-value="false" ${disabledAttr}>OFF</button>
            ${supportsTemperature ? `
            <button class="btn-control btn-temp" data-device="${type}" data-device-index="${unit.deviceIndex}" data-action="set_temperature" data-value="22" ${disabledAttr}>22°C</button>
            <button class="btn-control btn-temp" data-device="${type}" data-device-index="${unit.deviceIndex}" data-action="set_temperature" data-value="24" ${disabledAttr}>24°C</button>
            <button class="btn-control btn-temp" data-device="${type}" data-device-index="${unit.deviceIndex}" data-action="set_temperature" data-value="26" ${disabledAttr}>26°C</button>
            ` : ""}
          </div>
        </div>`;
    }).join("");

    const areaM2 = emu.roomArea !== null && emu.roomArea !== undefined ? `${fmt(emu.roomArea, 2)} m²` : "No configurado";
    const windowCount = emu.windowCount !== undefined && emu.windowCount !== null ? `${emu.windowCount}` : "No configurado";

    return `
    <div class="emulator-card">
      <div class="card-header">
        <div class="card-title">
          <div class="card-title-main">
            <strong>${escapeHtml(primaryTitle)}</strong>
            <span>${escapeHtml(secondaryTitle)}</span>
          </div>
          <span class="status-badge ${connClass}">${connLabel}</span>
        </div>
        <div class="card-meta">Último reporte: ${lastSeen}</div>
        <div class="card-meta">Habitación: <code>${escapeHtml(roomInfo)}</code></div>
        <div class="card-meta">Área ${areaM2} · ${windowCount} ventanas · Minisplits ${miniCount} · Purificadores ${purCount} · Extractores ${extCount}</div>
      </div>

      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-value">${hasMetrics ? `${temp}°C` : "—"}</div>
          <div class="metric-label">${hasMetrics ? "Temperatura" : "Sin métricas disponibles"}</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${hasMetrics ? `${humidity}%` : "—"}</div>
          <div class="metric-label">Humedad</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${co2}</div>
          <div class="metric-label">CO₂ (ppm)</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${pm25}</div>
          <div class="metric-label">PM2.5 (μg/m³)</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${areaM2}</div>
          <div class="metric-label">Área</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${windowCount}</div>
          <div class="metric-label">Ventanas</div>
        </div>
      </div>

      <div class="devices-section">
        <div class="section-label">Dispositivos</div>
        <div class="device-badges">${miniBadge} ${purBadge} ${extBadge}</div>
      </div>

      <div class="controls-section${controlsClass}" data-room-id="${isAssigned ? escapeHtml(emu.roomId) : ''}" data-emulator-id="${safeCardId}" data-assignment-status="${escapeHtml(assignmentStatus)}">
        <div class="section-label">Control Manual</div>
        ${controlHint}
        ${controlGroup("minisplit", "Minisplit", minisplitUnits, true)}
        ${controlGroup("purifier", "Purificador", purifierUnits, false)}
        ${controlGroup("extractor", "Extractor", extractorUnits, false)}
      </div>
      <div class="control-result" id="result-${safeCardId}"></div>
    </div>`;
  }).join("");

  const emptyState = emulators.length === 0
    ? `<div class="empty-state">${options.authRequired ? "Pega un JWT válido para ver solo tus rooms y emuladores." : "No hay rooms configurados para este usuario. Cuando crees una habitación aparecerá aquí."}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeAir Emulators Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; background: #0d1117; color: #c9d1d9; }
    h1 { color: #58a6ff; margin-bottom: 4px; }
    .header { margin-bottom: 20px; }
    .nav { margin-bottom: 20px; }
    .nav a { color: #58a6ff; margin-right: 20px; text-decoration: none; font-size: 14px; }
    .nav a:hover { text-decoration: underline; }
    .summary { display: flex; gap: 20px; margin-bottom: 20px; font-size: 13px; color: #8b949e; flex-wrap: wrap; }
    .token-section { margin-bottom: 20px; padding: 12px; background: #161b22; border-radius: 8px; border: 1px solid #30363d; }
    .token-section label { font-size: 13px; color: #8b949e; display: block; margin-bottom: 6px; }
    .token-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .token-section input { flex: 1; min-width: 280px; padding: 8px 10px; background: #0d1117; color: #c9d1d9; border: 1px solid #30363d; border-radius: 6px; font-size: 13px; }
    .token-section button { padding: 8px 12px; color: white; border: 0; border-radius: 6px; cursor: pointer; }
    .token-apply { background: #1f6feb; }
    .token-clear { background: #6e3333; }
    .token-hint { font-size: 11px; color: #6e7681; margin-top: 4px; }
    .debug-status { display: none; margin-bottom: 16px; padding: 10px 12px; border-radius: 8px; border: 1px solid #30363d; background: #161b22; color: #c9d1d9; font-size: 13px; }
    .debug-status.error { display: block; border-color: #da3633; background: rgba(218, 54, 51, 0.12); color: #ffb4ad; }
    .debug-status.success { display: block; border-color: #238636; background: rgba(35, 134, 54, 0.12); color: #b4f1b4; }
    .debug-status.info { display: block; border-color: #1f6feb; background: rgba(31, 111, 235, 0.12); color: #b9d8ff; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px; }
    .emulator-card { background: #161b22; border-radius: 12px; border: 1px solid #30363d; padding: 16px; }
    .emulator-card:hover { border-color: #58a6ff; }
    .card-header { margin-bottom: 14px; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
    .card-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; font-size: 15px; }
    .card-title-main { display: grid; gap: 2px; min-width: 0; }
    .card-title-main strong { color: #f0f6fc; overflow-wrap: anywhere; }
    .card-title-main span { color: #8b949e; font-size: 12px; font-weight: 600; }
    .card-meta { font-size: 12px; color: #8b949e; margin-bottom: 2px; }
    .status-badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .connected { background: #238636; color: white; }
    .disconnected { background: #da3633; color: white; }
    .available { background: #1f6feb; color: white; }
    .offline { background: #6e3333; color: white; }
    .unassigned { background: #6e7681; color: white; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
    .metric-box { background: #21262d; border-radius: 8px; padding: 10px 8px; text-align: center; }
    .metric-value { font-size: 18px; font-weight: 700; color: #f0f6fc; margin-bottom: 2px; }
    .metric-label { font-size: 11px; color: #8b949e; }
    .section-label { font-size: 12px; font-weight: 600; color: #8b949e; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .devices-section { margin-bottom: 14px; }
    .device-badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .device-badge { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .device-badge.on { background: #238636; color: white; }
    .device-badge.off { background: #6e7681; color: white; }
    .device-badge.unknown { background: #30363d; color: #8b949e; }
    .controls-section { border-top: 1px solid #30363d; padding-top: 12px; }
    .controls-section--disabled { opacity: 0.74; }
    .control-hint { margin: 0 0 10px; color: #f0b72f; font-size: 12px; }
    .control-group { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
    .control-label { font-size: 13px; color: #c9d1d9; min-width: 142px; }
    .btn-group { display: flex; gap: 4px; flex-wrap: wrap; }
    .btn-control { padding: 4px 10px; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
    .btn-control:hover { opacity: 0.8; }
    .btn-control:disabled { cursor: not-allowed; opacity: 0.45; }
    .btn-on { background: #1f6b3a; color: white; }
    .btn-on.is-active { background: #2ea043; box-shadow: 0 0 0 2px rgba(46, 160, 67, 0.34); }
    .btn-off { background: #6e3333; color: white; }
    .btn-off.is-active { background: #da3633; box-shadow: 0 0 0 2px rgba(218, 54, 51, 0.32); }
    .btn-temp { background: #1f6feb; color: white; }
    .control-result { font-size: 12px; margin-top: 4px; min-height: 16px; color: #58a6ff; }
    .control-result.error { color: #f85149; }
    .control-result.success { color: #3fb950; }
    .empty-state { text-align: center; padding: 40px; color: #8b949e; background: #161b22; border-radius: 12px; border: 1px solid #30363d; }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/debug/logs/html">Ver Logs</a>
    <a href="/debug/emulators/html">Dashboard Emuladores</a>
    <a href="/debug/status">Estado Sistema</a>
  </div>
  <div class="header">
    <h1>SafeAir Emulators Dashboard</h1>
    <div class="summary">
      <span>${options.global ? "Modo admin global" : "Modo operador"}</span>
      <span>Rooms visibles: ${emulators.filter((emu) => emu.roomId).length}</span>
      ${options.global ? `<span>Emuladores libres: ${emulators.filter((emu) => emu.assignmentStatus === "free").length}</span>` : ""}
      <span>Actualizado: <span id="clock">${localNow()}</span></span>
      <span>Zona: América/México (CDMX)</span>
    </div>
  </div>

  <div class="token-section">
    <label for="jwtToken">JWT Token (pegar desde Configuración del frontend local para filtrar y habilitar control):</label>
    <div class="token-row">
      <input type="text" id="jwtToken" autocomplete="off" spellcheck="false" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
      <button type="button" class="token-apply" id="applyJwtBtn">Aplicar JWT</button>
      <button type="button" class="token-clear" id="clearJwtBtn">Limpiar</button>
    </div>
    <div class="token-hint">El token se guarda en localStorage y se envía como Authorization: Bearer en cada request. No depende de cookies.</div>
  </div>

  <div class="debug-status" id="debugStatus" role="status" aria-live="polite"></div>

  <div class="cards-grid" id="emulatorCardsGrid">
    ${emulatorCards || emptyState}
  </div>

  <script src="/debug/assets/debug-emulators.js"></script>
</body>
</html>`;
}
