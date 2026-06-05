import { ApiRequestLogModel } from "../database/models";

export class ApiRequestLogRepository {
  async create(data: {
    method: string;
    path: string;
    statusCode: number;
    receivedAt: Date;
    respondedAt: Date;
    durationMs: number;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await ApiRequestLogModel.create({
      method: data.method,
      path: data.path,
      statusCode: data.statusCode,
      receivedAt: data.receivedAt,
      respondedAt: data.respondedAt,
      durationMs: data.durationMs,
      ip: data.ip ?? null,
      userAgent: data.userAgent ?? null
    });
  }
}
