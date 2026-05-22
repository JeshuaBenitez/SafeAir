import type { Request, Response } from "express";
import { container } from "../../application/container";

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
}

