import { DataTypes, Model } from "sequelize";
import type { Sequelize } from "sequelize";

export class AlarmModel extends Model {
  declare id: string;
  declare roomId: string;
  declare cycleId: string;
  declare type: "critical_persistence" | "abrupt_change" | "no_improvement" | "invalid_configuration";
  declare severity: "low" | "medium" | "high";
  declare message: string;
  declare isActive: boolean;
  declare triggeredAt: Date;
  declare resolvedAt: Date | null;
  declare metadata: Record<string, unknown>;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initAlarmModel(sequelize: Sequelize): void {
  AlarmModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      roomId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      cycleId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM("critical_persistence", "abrupt_change", "no_improvement", "invalid_configuration"),
        allowNull: false
      },
      severity: {
        type: DataTypes.ENUM("low", "medium", "high"),
        allowNull: false
      },
      message: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      triggeredAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "alarms",
      indexes: [{ fields: ["roomId", "isActive"] }]
    }
  );
}

