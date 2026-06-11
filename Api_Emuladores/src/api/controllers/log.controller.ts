import type { Request, Response } from "express";
import { getLogs, type LogEntry } from "../../application/services/debug-logs.service";

function normalizeSource(type: string | undefined): LogEntry["source"] | undefined {
  if (!type) return undefined;
  if (type === "api") return "api";
  if (type === "emulator" || type === "emulators") return "emulator";
  if (type === "mqtt") return "mqtt-received";
  return type as LogEntry["source"];
}

export class LogController {
  async list(req: Request, res: Response): Promise<void> {
    const limit = Number(req.query.limit ?? 100);
    const source = normalizeSource(typeof req.query.type === "string" ? req.query.type : undefined)
      ?? normalizeSource(typeof req.query.source === "string" ? req.query.source : undefined);
    const level = typeof req.query.level === "string" ? req.query.level as LogEntry["level"] : undefined;
    const roomId = typeof req.query.roomId === "string" ? req.query.roomId : undefined;
    const emulatorId = typeof req.query.emulator === "string"
      ? req.query.emulator
      : typeof req.query.emulatorId === "string"
        ? req.query.emulatorId
        : undefined;

    let logs = getLogs({ limit, source, level });

    if (roomId) {
      logs = logs.filter((log) => log.roomId === roomId);
    }

    if (emulatorId) {
      logs = logs.filter((log) => log.emulatorId === emulatorId);
    }

    res.status(200).json({ count: logs.length, logs });
  }
}
