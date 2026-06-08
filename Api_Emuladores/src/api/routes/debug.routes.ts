import type { Request } from "express";
import { Router } from "express";
import { DebugController, getEmulatorStates } from "../../application/services/debug-logs.service";
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

function readCookie(req: Request, name: string): string | null {
  const cookies = req.headers.cookie;
  if (!cookies) {
    return null;
  }

  const match = cookies
    .split(";")
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${name}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(name.length + 1));
}

function extractDebugToken(req: Request): string | null {
  const header = req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    return header.replace("Bearer ", "").trim();
  }

  const cookieToken = readCookie(req, "safeair_debug_jwt");
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

function getDebugUserId(req: Request): string | null {
  const token = extractDebugToken(req);
  if (!token) {
    return null;
  }

  try {
    return verifyToken(token).sub;
  } catch {
    return null;
  }
}

function deviceDisplay(isOn: boolean | null | undefined, targetTemp: number | null | undefined, label: string, emoji: string, hasTemp: boolean): string {
  if (isOn === null || isOn === undefined) return `<span class="device-badge unknown">${emoji} ${label}: N/A</span>`;
  const stateClass = isOn ? "on" : "off";
  const stateLabel = isOn ? "ON" : "OFF";
  const tempStr = hasTemp && targetTemp !== null && targetTemp !== undefined ? ` (${targetTemp}°C)` : "";
  return `<span class="device-badge ${stateClass}">${emoji} ${label}: ${stateLabel}${tempStr}</span>`;
}

// ── Navigation links constant (used by all HTML pages) ────────────────────

// ── Routes ──────────────────────────────────────────────────────────────────

// Get logs as JSON
debugRouter.get("/logs", (req, res, next) => {
  debugController.getLogs(req, res).catch(next);
});

// Get logs as HTML
debugRouter.get("/logs/html", (req, res, next) => {
  // Disable caching to ensure fresh data on refresh
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  debugController.getLogsHtml(req, res).catch(next);
});

// Get system status
debugRouter.get("/status", (req, res, next) => {
  debugController.getStatus(req, res).catch(next);
});

function buildDebugEmulatorView(req: Request) {
  const userId = getDebugUserId(req);
  return { userId };
}

// Get emulators dashboard as JSON
debugRouter.get("/emulators", async (req, res) => {
  const { userId } = buildDebugEmulatorView(req);
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
  const emulatorsFromDb = await emulatorRepository.findAllWithRoomDetails(userId);
  const emulators = emulatorsFromDb.map(emuDb => {
    const memoryState = emuDb.emulatorExternalId ? memoryMap.get(emuDb.emulatorExternalId) : undefined;
    return {
      emulatorId: emuDb.emulatorExternalId,
      roomId: emuDb.roomId,
      roomName: emuDb.roomName,
      hasEmulator: emuDb.hasEmulator,
      connected: emuDb.hasEmulator ? (memoryState?.connected ?? (emuDb.status === "online")) : false,
      lastSeen: memoryState?.lastSeen,
      metrics: memoryState?.metrics ?? null,
      devices: memoryState?.devices ?? null
    };
  });

  res.status(200).json({ count: emulators.length, emulators });
});

// Get emulators dashboard as HTML - combines PostgreSQL config + memory telemetry
debugRouter.get("/emulators/html", async (req, res) => {
  try {
    const { userId } = buildDebugEmulatorView(req);

    // Get real-time state from memory (telemetry)
    const emulatorsFromMemory = getEmulatorStates();
    const memoryMap = new Map(emulatorsFromMemory.map(e => [e.emulatorId, e]));

    // Get user-owned rooms and their emulator assignment from PostgreSQL
    const emulatorsFromDb = userId ? await emulatorRepository.findAllWithRoomDetails(userId) : [];

    // Combine both sources
    const combinedEmulators = emulatorsFromDb.map(emuDb => {
      const memoryState = emuDb.emulatorExternalId ? memoryMap.get(emuDb.emulatorExternalId) : undefined;
      return {
        emulatorId: emuDb.emulatorExternalId,
        roomId: emuDb.roomId,
        roomName: emuDb.roomName,
        roomArea: emuDb.roomArea,
        windowCount: emuDb.windowCount,
        minisplitCount: emuDb.minisplitCount,
        purifierCount: emuDb.purifierCount,
        extractorCount: emuDb.extractorCount,
        hasEmulator: emuDb.hasEmulator,
        connected: emuDb.hasEmulator ? (memoryState?.connected ?? (emuDb.status === "online")) : false,
        lastSeen: memoryState?.lastSeen,
        metrics: memoryState?.metrics || null,
        devices: memoryState?.devices || null
      };
    });

    const html = generateEmulatorsHtml(combinedEmulators, { authRequired: !userId });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    console.error('Error generating emulators dashboard:', err);
    res.status(500).send('Error loading dashboard');
  }
});

// ── Emulators dashboard HTML generator ──────────────────────────────────────

function generateEmulatorsHtml(emulators: any[], options: { authRequired: boolean }): string {
  const emulatorCards = emulators.map((emu, index) => {
    const cardId = emu.emulatorId || `room-${emu.roomId || index}`;
    const safeCardId = escapeHtml(cardId);
    const connClass = !emu.hasEmulator ? "unassigned" : (emu.connected ? "connected" : "disconnected");
    const connLabel = emu.hasEmulator ? (emu.connected ? "✅ Conectado" : "❌ Desconectado") : "Sin emulador asignado";
    const lastSeen = toLocalTime(emu.lastSeen);
    const hasMetrics = Boolean(emu.hasEmulator && emu.metrics);
    const controlsDisabled = !emu.hasEmulator || !emu.roomId;
    const disabledAttr = controlsDisabled ? "disabled" : "";
    const controlsClass = controlsDisabled ? " controls-section--disabled" : "";
    const controlHint = controlsDisabled
      ? `<div class="control-hint">Sin emulador asignado: el control manual queda deshabilitado para evitar comandos a rooms inválidos.</div>`
      : "";

    const temp = fmt(emu.metrics?.temperature, 2);
    const humidity = fmt(emu.metrics?.humidity, 2);
    const co2 = fmt(emu.metrics?.co2, 2);
    const pm25 = fmt(emu.metrics?.pm25, 2);
    
    // Room info from PostgreSQL
    const roomName = emu.roomName || emu.roomId || "Sin room válido";
    const roomInfo = emu.roomName ? `${roomName} (ID: ${emu.roomId?.substring(0, 8)}...)` : (emu.roomId ? `ID: ${emu.roomId.substring(0, 8)}...` : "No hay habitación");
    const emulatorLabel = emu.emulatorId || "Sin emulador asignado";

    // Get device counts from DB or use from memory
    const miniCount = emu.minisplitCount ?? (emu.devices?.minisplit?.isOn !== null && emu.devices?.minisplit?.isOn !== undefined ? 1 : 0);
    const purCount = emu.purifierCount ?? (emu.devices?.purifier?.isOn !== null && emu.devices?.purifier?.isOn !== undefined ? 1 : 0);
    const extCount = emu.extractorCount ?? (emu.devices?.extractor?.isOn !== null && emu.devices?.extractor?.isOn !== undefined ? 1 : 0);

    const miniIsOn = emu.devices?.minisplit?.isOn;
    const miniTemp = emu.devices?.minisplit?.targetTemperature;
    const purIsOn = emu.devices?.purifier?.isOn;
    const extIsOn = emu.devices?.extractor?.isOn;

    const miniBadge = emu.hasEmulator ? deviceDisplay(miniIsOn, miniTemp, `Minisplit (${miniCount})`, "❄️", true) : `<span class="device-badge unknown">❄️ Minisplit (${miniCount}): N/A</span>`;
    const purBadge = emu.hasEmulator ? deviceDisplay(purIsOn, null, `Purificador (${purCount})`, "🌬️", false) : `<span class="device-badge unknown">🌬️ Purificador (${purCount}): N/A</span>`;
    const extBadge = emu.hasEmulator ? deviceDisplay(extIsOn, null, `Extractor (${extCount})`, "💨", false) : `<span class="device-badge unknown">💨 Extractor (${extCount}): N/A</span>`;

    const areaM2 = emu.roomArea !== null && emu.roomArea !== undefined ? `${fmt(emu.roomArea, 2)} m²` : "No configurado";
    const windowCount = emu.windowCount !== undefined && emu.windowCount !== null ? `${emu.windowCount}` : "No configurado";

    return `
    <div class="emulator-card">
      <div class="card-header">
        <div class="card-title">
          <strong>${escapeHtml(emulatorLabel)}</strong>
          <span class="status-badge ${connClass}">${connLabel}</span>
        </div>
        <div class="card-meta">Último reporte: ${lastSeen}</div>
        <div class="card-meta">Habitación: <code>${escapeHtml(roomInfo)}</code></div>
        <div class="card-meta">📐 ${areaM2} · 🪟 ${windowCount} ventanas · ❄️ ${miniCount} · 🌬️ ${purCount} · 💨 ${extCount}</div>
      </div>

      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-value">${hasMetrics ? `${temp}°C` : "—"}</div>
          <div class="metric-label">🌡️ ${hasMetrics ? "Temperatura" : "Sin métricas disponibles"}</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${hasMetrics ? `${humidity}%` : "—"}</div>
          <div class="metric-label">💧 Humedad</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${co2}</div>
          <div class="metric-label">🌬️ CO₂ (ppm)</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${pm25}</div>
          <div class="metric-label">🌫️ PM2.5 (μg/m³)</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${areaM2}</div>
          <div class="metric-label">📐 Área</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${windowCount}</div>
          <div class="metric-label">🪟 Ventanas</div>
        </div>
      </div>

      <div class="devices-section">
        <div class="section-label">⚙️ Dispositivos</div>
        <div class="device-badges">${miniBadge} ${purBadge} ${extBadge}</div>
      </div>

      <div class="controls-section${controlsClass}" data-room-id="${escapeHtml(emu.roomId || '')}" data-emulator-id="${safeCardId}">
        <div class="section-label">🎮 Control Manual</div>
        ${controlHint}
        
        <div class="control-group">
          <span class="control-label">❄️ Minisplit</span>
          <div class="btn-group">
            <button class="btn-control btn-on" data-device="minisplit" data-action="turn_on" data-value="true" ${disabledAttr}>ON</button>
            <button class="btn-control btn-off" data-device="minisplit" data-action="turn_off" data-value="false" ${disabledAttr}>OFF</button>
            <button class="btn-control btn-temp" data-device="minisplit" data-action="set_temperature" data-value="22" ${disabledAttr}>22°C</button>
            <button class="btn-control btn-temp" data-device="minisplit" data-action="set_temperature" data-value="24" ${disabledAttr}>24°C</button>
            <button class="btn-control btn-temp" data-device="minisplit" data-action="set_temperature" data-value="26" ${disabledAttr}>26°C</button>
          </div>
        </div>

        <div class="control-group">
          <span class="control-label">🌬️ Purificador</span>
          <div class="btn-group">
            <button class="btn-control btn-on" data-device="purifier" data-action="turn_on" data-value="true" ${disabledAttr}>ON</button>
            <button class="btn-control btn-off" data-device="purifier" data-action="turn_off" data-value="false" ${disabledAttr}>OFF</button>
          </div>
        </div>

        <div class="control-group">
          <span class="control-label">💨 Extractor</span>
          <div class="btn-group">
            <button class="btn-control btn-on" data-device="extractor" data-action="turn_on" data-value="true" ${disabledAttr}>ON</button>
            <button class="btn-control btn-off" data-device="extractor" data-action="turn_off" data-value="false" ${disabledAttr}>OFF</button>
          </div>
        </div>
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
    .token-section { margin-bottom: 20px; padding: 12px; background: #161b22; border-radius: 8px; border: 1px solid #30363d; }
    .token-section label { font-size: 13px; color: #8b949e; display: block; margin-bottom: 6px; }
    .token-section input { width: 100%; padding: 6px 10px; background: #0d1117; color: #c9d1d9; border: 1px solid #30363d; border-radius: 6px; font-size: 13px; max-width: 600px; }
    .token-hint { font-size: 11px; color: #6e7681; margin-top: 4px; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px; }
    .emulator-card { background: #161b22; border-radius: 12px; border: 1px solid #30363d; padding: 16px; }
    .emulator-card:hover { border-color: #58a6ff; }
    .card-header { margin-bottom: 14px; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
    .card-title { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; font-size: 15px; }
    .card-meta { font-size: 12px; color: #8b949e; margin-bottom: 2px; }
    .status-badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .connected { background: #238636; color: white; }
    .disconnected { background: #da3633; color: white; }
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
    .control-label { font-size: 13px; color: #c9d1d9; min-width: 80px; }
    .btn-group { display: flex; gap: 4px; flex-wrap: wrap; }
    .btn-control { padding: 4px 10px; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
    .btn-control:hover { opacity: 0.8; }
    .btn-control:disabled { cursor: not-allowed; opacity: 0.45; }
    .btn-on { background: #238636; color: white; }
    .btn-off { background: #6e7681; color: white; }
    .btn-temp { background: #1f6feb; color: white; }
    .control-result { font-size: 12px; margin-top: 4px; min-height: 16px; color: #58a6ff; }
    .control-result.error { color: #f85149; }
    .control-result.success { color: #3fb950; }
    .empty-state { text-align: center; padding: 40px; color: #8b949e; background: #161b22; border-radius: 12px; border: 1px solid #30363d; }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/debug/logs/html">📋 Ver Logs</a>
    <a href="/debug/emulators/html">📱 Dashboard Emuladores</a>
    <a href="/debug/status">⚙️ Estado Sistema</a>
  </div>
  <div class="header">
    <div class="header-left">
      <h1>📱 SafeAir Emulators Dashboard</h1>
      <div class="summary">
        <span>📊 Rooms del usuario: ${emulators.length}</span>
        <span>🕐 Actualizado: <span id="clock">${localNow()}</span></span>
        <span>⏱️ Zona: América/México (CDMX)</span>
      </div>
    </div>
    <div class="header-right">
      <label class="auto-refresh">
        <input type="checkbox" id="autoRefresh" checked> Auto-refresh cada 5s
      </label>
      <button class="refrescar" id="refreshBtn">🔄 Refresh</button>
    </div>
  </div>

  <div class="token-section">
    <label for="jwtToken">🔑 JWT Token (pegar desde Configuración del frontend local para filtrar y habilitar control):</label>
    <input type="text" id="jwtToken" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
    <div class="token-hint">El token se guarda en localStorage y en una cookie local de debug para que esta página renderice solo tus rooms. Al pegar uno nuevo, la página se recarga.</div>
  </div>

  <div class="cards-grid">
    ${emulatorCards || emptyState}
  </div>

  <script src="/debug/assets/debug-emulators.js"></script>
</body>
</html>`;
}
