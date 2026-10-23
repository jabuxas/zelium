import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../database/connection";

export type NotificacaoTipo =
  | "avaria"
  | "solicitacao_criada"
  | "solicitacao_status";

export type NotificacaoStatus = "pendente" | "enviada" | "simulada" | "falha";

export class Notificacao extends Model<
  InferAttributes<Notificacao>,
  InferCreationAttributes<Notificacao>
> {
  declare id: CreationOptional<number>;
  declare organizacao_id: number;
  declare tipo: NotificacaoTipo;
  declare assunto: string;
  declare corpo: string;
  declare destinatarios: string[];
  declare status: CreationOptional<NotificacaoStatus>;
  declare erro: string | null;
}

Notificacao.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    organizacao_id: { type: DataTypes.INTEGER, allowNull: false },
    tipo: { type: DataTypes.STRING(40), allowNull: false },
    assunto: { type: DataTypes.STRING(200), allowNull: false },
    corpo: { type: DataTypes.TEXT, allowNull: false },
    destinatarios: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pendente",
    },
    erro: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "notificacao",
    orgScoped: true,
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);
