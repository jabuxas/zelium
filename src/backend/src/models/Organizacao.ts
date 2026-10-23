import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../database/connection";

export class Organizacao extends Model<
  InferAttributes<Organizacao>,
  InferCreationAttributes<Organizacao>
> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare slug: string;
  declare ativo: CreationOptional<boolean>;
}

Organizacao.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(150), allowNull: false },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    tableName: "organizacao",
    timestamps: true,
    paranoid: true,
    underscored: true,
  }
);
