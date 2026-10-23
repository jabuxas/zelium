import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../database/connection";

/**
 * Registro de conferência física (inventário em campo): quem conferiu,
 * quando, qual estado foi confirmado e observações.
 */
export class Conferencia extends Model<
  InferAttributes<Conferencia>,
  InferCreationAttributes<Conferencia>
> {
  declare id: CreationOptional<number>;
  declare organizacao_id: number;
  declare patrimonio_id: number;
  declare usuario_id: number;
  declare estado_item_id: number | null;
  declare observacao: string | null;
}

Conferencia.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    organizacao_id: { type: DataTypes.INTEGER, allowNull: false },
    patrimonio_id: { type: DataTypes.INTEGER, allowNull: false },
    usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    estado_item_id: { type: DataTypes.INTEGER, allowNull: true },
    observacao: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "conferencia",
    orgScoped: true,
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);
