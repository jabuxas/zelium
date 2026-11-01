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
  declare modalidade_acesso: CreationOptional<'legado' | 'trial'>;
  declare trial_inicio: CreationOptional<Date | null>;
  declare trial_fim: CreationOptional<Date | null>;
  declare limite_patrimonios: CreationOptional<number | null>;
  declare limite_usuarios: CreationOptional<number | null>;
}

Organizacao.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(150), allowNull: false },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    modalidade_acesso: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'legado' },
    trial_inicio: { type: DataTypes.DATE, allowNull: true },
    trial_fim: { type: DataTypes.DATE, allowNull: true },
    limite_patrimonios: { type: DataTypes.INTEGER, allowNull: true },
    limite_usuarios: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    tableName: "organizacao",
    timestamps: true,
    paranoid: true,
    underscored: true,
  }
);
