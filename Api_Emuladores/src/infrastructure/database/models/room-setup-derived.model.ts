import { DataTypes, Model } from "sequelize";
import type { Sequelize } from "sequelize";

export class RoomSetupDerivedModel extends Model {
  declare id: string;
  declare roomId: string;
  declare roomArea: number;
  declare windowAreaRatio: number;
  declare windowFactorBase: number;
  declare windowFactor: number;
  declare areaTermica: number;
  declare areaCalidadAire: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initRoomSetupDerivedModel(sequelize: Sequelize): void {
  RoomSetupDerivedModel.init(
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
      roomArea: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      windowAreaRatio: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      windowFactorBase: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      windowFactor: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      areaTermica: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      areaCalidadAire: {
        type: DataTypes.FLOAT,
        allowNull: false
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: "room_setup_derived"
    }
  );
}

