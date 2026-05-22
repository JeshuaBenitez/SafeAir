import { DataTypes, Model } from "sequelize";
import type { Sequelize } from "sequelize";

export class ApiRequestLogModel extends Model {
  declare id: string;
  declare method: string;
  declare path: string;
  declare statusCode: number;
  declare receivedAt: Date;
  declare respondedAt: Date;
  declare durationMs: number;
  declare ip: string | null;
  declare userAgent: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initApiRequestLogModel(sequelize: Sequelize): void {
  ApiRequestLogModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      method: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      path: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      statusCode: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      receivedAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      respondedAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      durationMs: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      ip: {
        type: DataTypes.STRING(64),
        allowNull: true
      },
      userAgent: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "api_request_logs",
      indexes: [{ fields: ["receivedAt"] }, { fields: ["path", "receivedAt"] }]
    }
  );
}
