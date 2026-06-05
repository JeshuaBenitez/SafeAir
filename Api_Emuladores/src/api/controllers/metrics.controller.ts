import type { Request, Response } from "express";
import { container } from "../../application/container";

/**
 * Generate CSV content from metrics data
 */
function generateCsv(measurements: Record<string, unknown>[]): string {
  if (measurements.length === 0) {
    return "No data available";
  }

  const headers = ["timestamp", "temperature", "humidity", "co2", "pm25", "roomId"];
  const rows = measurements.map((m) =>
    headers.map((h) => {
      const val = m[h as keyof typeof m];
      return val === null || val === undefined ? "" : String(val);
    }).join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Generate HTML table for PDF replacement (simple approach without external libraries)
 */
function generateHtmlTable(measurements: Record<string, unknown>[]): string {
  if (measurements.length === 0) {
    return "<p>No data available</p>";
  }

  const headers = ["Timestamp", "Temperature", "Humidity", "CO2", "PM2.5"];
  const rows = measurements
    .map(
      (m) => `
    <tr>
      <td>${m.measuredAt || ""}</td>
      <td>${m.temperature ?? ""}°C</td>
      <td>${m.humidity ?? ""}%</td>
      <td>${m.co2 ?? ""} ppm</td>
      <td>${m.pm25 ?? ""} μg/m³</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SafeAir Historical Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #1a73e8; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #1a73e8; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .footer { margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>📊 SafeAir Historical Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="footer">
    <p>SafeAir Distributed Services - Monitoreo y Control Distribuido</p>
  </div>
</body>
</html>`;
}

export class MetricsController {
  async ingestTelemetry(req: Request, res: Response): Promise<void> {
    await container.telemetryIngestionService.handleIncomingTelemetry(req.body, "rest");
    res.status(202).json({ accepted: true });
  }

  async ingestActuatorState(req: Request, res: Response): Promise<void> {
    await container.actuatorStateIngestionService.handleIncomingState(req.body, "rest");
    res.status(202).json({ accepted: true });
  }

  async current(req: Request, res: Response): Promise<void> {
    const result = await container.metricsQueryService.current(String(req.params.id));
    res.status(200).json(result);
  }

  async history(req: Request, res: Response): Promise<void> {
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const result = await container.metricsQueryService.history(String(req.params.id), from, to);
    res.status(200).json(result);
  }

  async actuatorState(req: Request, res: Response): Promise<void> {
    const result = await container.metricsQueryService.actuatorState(String(req.params.id));
    res.status(200).json(result);
  }

  /**
   * Export metrics history as CSV or HTML (for printing/PDF)
   */
  async export(req: Request, res: Response): Promise<void> {
    const roomId = String(req.params.id);
    const from = typeof req.query.from === "string" ? req.query.from : undefined;
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    const format = (req.query.format as string) || "csv";

    const measurements = await container.metricsQueryService.history(roomId, from, to);

    if (format === "csv") {
      const csv = generateCsv(measurements as Record<string, unknown>[]);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="safeair-metrics-${roomId}.csv"`);
      res.status(200).send(csv);
    } else {
      // HTML format (can be printed to PDF from browser)
      const html = generateHtmlTable(measurements as Record<string, unknown>[]);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(html);
    }
  }
}

