import { Router } from "express";
import { DebugController, getEmulatorStates } from "../../application/services/debug-logs.service";

const debugController = new DebugController();
export const debugRouter = Router();

/**
 * Debug endpoints for monitoring and troubleshooting
 * These endpoints are typically disabled in production
 */

// Get logs as JSON (for programmatic access)
debugRouter.get("/logs", (req, res, next) => {
  debugController.getLogs(req, res).catch(next);
});

// Get logs as HTML (for browser viewing)
debugRouter.get("/logs/html", (req, res, next) => {
  debugController.getLogsHtml(req, res).catch(next);
});

// Get system status
debugRouter.get("/status", (req, res, next) => {
  debugController.getStatus(req, res).catch(next);
});

// Get emulators dashboard as JSON
debugRouter.get("/emulators", (_req, res) => {
  const emulators = getEmulatorStates();
  res.status(200).json({
    count: emulators.length,
    emulators,
  });
});

// Get emulators dashboard as HTML
debugRouter.get("/emulators/html", (_req, res) => {
  const emulators = getEmulatorStates();
  const html = generateEmulatorsHtml(emulators);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
});

/**
 * Generate HTML for emulators dashboard
 */
function generateEmulatorsHtml(emulators: any[]): string {
  const emulatorRows = emulators
    .map((emu) => {
      const minisplitStatus = emu.devices?.minisplit?.isOn === true ? "ON" : emu.devices?.minisplit?.isOn === false ? "OFF" : "N/A";
      const minisplitTemp = emu.devices?.minisplit?.targetTemperature ?? "N/A";
      const purifierStatus = emu.devices?.purifier?.isOn === true ? "ON" : emu.devices?.purifier?.isOn === false ? "OFF" : "N/A";
      const extractorStatus = emu.devices?.extractor?.isOn === true ? "ON" : emu.devices?.extractor?.isOn === false ? "OFF" : "N/A";

      return `
      <tr>
        <td><strong>${emu.emulatorId}</strong></td>
        <td>${emu.roomId || "N/A"}</td>
        <td><span class="status-badge ${emu.connected ? 'connected' : 'disconnected'}">${emu.connected ? '✅ Conectado' : '❌ Desconectado'}</span></td>
        <td>${emu.lastSeen ? new Date(emu.lastSeen).toLocaleString() : "N/A"}</td>
        <td>${emu.metrics?.temperature ?? "-"}°C</td>
        <td>${emu.metrics?.humidity ?? "-"}%</td>
        <td>${emu.metrics?.co2 ?? "-"} ppm</td>
        <td>${emu.metrics?.pm25 ?? "-"} μg/m³</td>
        <td>
          <span class="device ${minisplitStatus === 'ON' ? 'on' : minisplitStatus === 'OFF' ? 'off' : ''}">❄️ Minisplit: ${minisplitStatus} (${minisplitTemp}°C)</span><br>
          <span class="device ${purifierStatus === 'ON' ? 'on' : purifierStatus === 'OFF' ? 'off' : ''}">🌬️ Purificador: ${purifierStatus}</span><br>
          <span class="device ${extractorStatus === 'ON' ? 'on' : extractorStatus === 'OFF' ? 'off' : ''}">💨 Extractor: ${extractorStatus}</span>
        </td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafeAir Emulators Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', system-ui, sans-serif; 
      margin: 0; 
      padding: 20px; 
      background: #0d1117;
      color: #c9d1d9;
    }
    h1 { color: #58a6ff; margin-bottom: 10px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .refrescar { padding: 8px 16px; background: #238636; color: white; border: none; border-radius: 6px; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; background: #161b22; border-radius: 8px; overflow: hidden; }
    th { background: #21262d; padding: 12px; text-align: left; font-weight: 600; color: #8b949e; }
    td { padding: 10px 12px; border-bottom: 1px solid #30363d; font-size: 13px; }
    tr:hover { background: #1f242c; }
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .connected { background: #238636; color: white; }
    .disconnected { background: #da3633; color: white; }
    .device { padding: 2px 8px; margin: 2px; border-radius: 4px; font-size: 12px; display: inline-block; }
    .device.on { background: #238636; color: white; }
    .device.off { background: #6e7681; color: white; }
    .summary { display: flex; gap: 20px; margin-bottom: 15px; font-size: 13px; color: #8b949e; }
    .nav { margin-bottom: 20px; }
    .nav a { color: #58a6ff; margin-right: 20px; text-decoration: none; }
    .nav a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="nav">
    <a href="/debug/logs.html">📋 Ver Logs</a>
    <a href="/debug/emulators/html">📱 Dashboard Emuladores</a>
    <a href="/debug/status">⚙️ Estado Sistema</a>
  </div>
  <div class="header">
    <h1>📱 SafeAir Emulators Dashboard</h1>
    <button class="refrescar" onclick="location.reload()">🔄 Refresh</button>
  </div>
  <div class="summary">
    <span>📊 Total Emuladores: ${emulators.length}</span>
    <span>🕐 Actualizado: ${new Date().toLocaleTimeString()}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Room</th>
        <th>Conexión</th>
        <th>Último Reporte</th>
        <th>Temp</th>
        <th>Humedad</th>
        <th>CO2</th>
        <th>PM2.5</th>
        <th>Dispositivos</th>
      </tr>
    </thead>
    <tbody>
      ${emulatorRows || '<tr><td colspan="9" style="text-align:center">No hay emuladores conectados</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
}
