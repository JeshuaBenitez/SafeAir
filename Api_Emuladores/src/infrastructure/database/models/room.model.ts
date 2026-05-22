import { DataTypes, Model } from "sequelize";
import type { Sequelize } from "sequelize";

export class RoomModel extends Model {
  declare id: string;
  declare instanceId: string;
  declare name: string;
  declare status: "idle" | "monitoring" | "alarm";
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initRoomModel(sequelize: Sequelize): void {
  RoomModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      instanceId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM("idle", "monitoring", "alarm"),
        allowNull: false,
        defaultValue: "idle"
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "rooms"
    }
  );
}

