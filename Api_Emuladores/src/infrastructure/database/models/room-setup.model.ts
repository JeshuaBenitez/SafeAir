import { DataTypes, Model } from "sequelize";
import type { Sequelize } from "sequelize";

const ACTUATOR_SIZE_VALUES = ["small", "medium", "large"];

export class RoomSetupModel extends Model {
  declare id: string;
  declare roomId: string;
  declare roomWidth: number;
  declare roomLength: number;
  declare roomHeight: number;
  declare windowCount: number;
  declare windowAreaTotal: number;
  declare minisplitCount: number;
  declare purifierCount: number;
  declare extractorCount: number;
  declare minisplitSize: string;
  declare purifierSize: string;
  declare extractorSize: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initRoomSetupModel(sequelize: Sequelize): void {
  RoomSetupModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      roomId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
      },
      roomWidth: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      roomLength: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      roomHeight: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      windowCount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      windowAreaTotal: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      minisplitCount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      purifierCount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      extractorCount: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      minisplitSize: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "medium",
        validate: { isIn: [ACTUATOR_SIZE_VALUES] }
      },
      purifierSize: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "medium",
        validate: { isIn: [ACTUATOR_SIZE_VALUES] }
      },
      extractorSize: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: "medium",
        validate: { isIn: [ACTUATOR_SIZE_VALUES] }
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "room_setups"
    }
  );
}
