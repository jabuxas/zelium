import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../database/connection";

export const PAPEIS = ["gestor", "responsavel", "conferente"] as const;
export type UsuarioPapel = (typeof PAPEIS)[number];

export class Usuario extends Model<
  InferAttributes<Usuario>,
  InferCreationAttributes<Usuario>
> {
  declare id: CreationOptional<number>;
  declare nome: string;
  declare email: string;
  declare senha_hash: string;
  declare papel: UsuarioPapel;
  declare ativo: boolean;
  declare organizacao_id: CreationOptional<number>;
  declare sessao_version: CreationOptional<number>;
  declare versao: CreationOptional<number>;
}

Usuario.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    senha_hash: { type: DataTypes.STRING(100), allowNull: false },
    papel: {
      type: DataTypes.ENUM(...PAPEIS),
      allowNull: false,
      defaultValue: "conferente",
    },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    organizacao_id: { type: DataTypes.INTEGER, allowNull: false },
    sessao_version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    versao: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  },
  {
    sequelize,
    tableName: "usuario",
    orgScoped: true,
    timestamps: true,
    paranoid: true,
    underscored: true,
    version: "versao",
    defaultScope: {
      attributes: { exclude: ["senha_hash"] },
    },
  }
);

Usuario.prototype.toJSON = function toJSON() {
  const json = Model.prototype.toJSON.call(this) as Record<string, unknown>;
  delete json.senha_hash;
  return json;
};
