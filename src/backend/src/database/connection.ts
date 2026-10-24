import { Model, ModelStatic, Op, Sequelize } from "sequelize";
import { dbConfig } from "../config/database";
import { currentContext, currentOrgId, DEFAULT_ORG_ID } from "../context/requestContext";
import { ReferenciaDeOutraOrganizacaoError } from "../context/errors";
import { sanitizarAuditoria } from '../services/auditData';
import { autorAuditoria } from '../services/auditAuthor';

declare module "sequelize" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface InitOptions<M extends Model = Model> {
    /** Marca o modelo como isolado por organização (multiempresa). */
    orgScoped?: boolean;
  }
}

export const sequelize = new Sequelize({
  dialect: "postgres",
  ...dbConfig,
  logging: process.env.NODE_ENV === "development" ? console.log : false,
});

// ---------------------------------------------------------------------------
// Isolamento multiempresa
//
// Modelos marcados com `orgScoped: true` (todos os dados de negócio) têm
// TODAS as consultas automaticamente filtradas pela organização do usuário da
// requisição (AsyncLocalStorage). Escritas recebem a organizacao_id do
// contexto e validam que referências (FKs) pertencem à mesma organização.
// ---------------------------------------------------------------------------

interface ModelWithOrg extends Model {
  organizacao_id?: number | null;
}

type OrgScopedModel = ModelStatic<ModelWithOrg> & {
  options?: { orgScoped?: boolean };
};

function orgOfModel(model: OrgScopedModel): boolean {
  return model.options?.orgScoped === true;
}

// FKs que devem pertencer à mesma organização do registro
const ORG_FKS: Record<string, string[]> = {
  ambiente: ["responsavel_id"],
  patrimonio: [
    "tipo_material_id",
    "estado_item_id",
    "ambiente_id",
    "responsavel_id",
    "fornecedor_id",
  ],
  solicitacao: ["patrimonio_id", "conferente_id"],
  patrimonio_fotos: ["patrimonio_id"],
  conferencia: ["patrimonio_id", "usuario_id", "estado_item_id"],
};

function aplicarEscopo(this: OrgScopedModel, options: any) {
  const model = this;
  if (!orgOfModel(model)) return;
  const orgId = currentOrgId();
  if (orgId === undefined) return;

  const orgWhere = { organizacao_id: orgId };
  options.where = options.where
    ? { [Op.and]: [options.where, orgWhere] }
    : orgWhere;
}

sequelize.addHook('beforeFind', aplicarEscopo);
sequelize.addHook('beforeCount', aplicarEscopo);

function atribuirOrganizacao(instance: ModelWithOrg) {
  const orgId = currentOrgId();
  if (orgId !== undefined && instance.organizacao_id != null && instance.organizacao_id !== orgId) {
    throw new ReferenciaDeOutraOrganizacaoError('Organizacao do registro difere da sessao autenticada');
  }
  if (instance.organizacao_id == null) {
    instance.set('organizacao_id' as any, orgId ?? DEFAULT_ORG_ID);
  }
}

sequelize.addHook("beforeCreate", function (instance: ModelWithOrg) {
  const model = instance.constructor as OrgScopedModel;
  if (!orgOfModel(model)) return;

  atribuirOrganizacao(instance);
});

sequelize.addHook("beforeUpdate", function (instance: ModelWithOrg) {
  const model = instance.constructor as OrgScopedModel;
  if (!orgOfModel(model)) return;

  // Um usuário jamais pode mover um registro para outra organização
  const orgId = currentOrgId();
  if (orgId !== undefined && instance.organizacao_id !== orgId) {
    throw new ReferenciaDeOutraOrganizacaoError("Registro de outra organizacao");
  }
});

function findModelByTable(table: string): ModelStatic<ModelWithOrg> | undefined {
  for (const model of Object.values(sequelize.models)) {
    if ((model as unknown as OrgScopedModel).getTableName() === table) {
      return model as ModelStatic<ModelWithOrg>;
    }
  }
  return undefined;
}

sequelize.addHook("beforeValidate", async function (instance: ModelWithOrg) {
  const model = instance.constructor as OrgScopedModel;
  if (!orgOfModel(model)) return;

  // Preenche a organizacao ANTES da validacao notNull
  atribuirOrganizacao(instance);

  const fks = ORG_FKS[model.getTableName() as string];
  if (!fks || fks.length === 0) return;

  const organizacaoId = instance.organizacao_id ?? currentOrgId() ?? DEFAULT_ORG_ID;

  for (const fkField of fks) {
    const fkValue = instance.get(fkField as any) as number | undefined | null;
    if (fkValue === undefined || fkValue === null) continue;

    const targetTable = FK_TABLE[fkField];
    if (!targetTable) continue;

    const targetModel = findModelByTable(targetTable);
    if (!targetModel) continue;

    // A referência precisa existir e pertencer à MESMA organização
    const alvo = await targetModel.findOne({
      where: { id: fkValue, organizacao_id: organizacaoId } as any,
    });
    if (!alvo) {
      throw new ReferenciaDeOutraOrganizacaoError(
        `Referencia invalida: ${fkField} nao pertence a esta organizacao`
      );
    }
  }
});

const FK_TABLE: Record<string, string> = {
  responsavel_id: "responsavel",
  tipo_material_id: "tipo_material",
  estado_item_id: "estado_item",
  ambiente_id: "ambiente",
  fornecedor_id: "fornecedor",
  patrimonio_id: "patrimonio",
  conferente_id: "conferente",
  usuario_id: "usuario",
};

// ---------------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------------

const logAction = async (
  action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE",
  instance: any,
  options: any,
) => {
  const tableName =
    instance.constructor.tableName || (instance.constructor as any).tableName;
  if (tableName === "audit_log" || tableName === "notificacao") {
    return;
  }

  const AuditLogModel = instance.sequelize.models.AuditLog;
  if (!AuditLogModel) {
    return;
  }

  const registroId = instance.getDataValue("id");
  let dadosAnteriores: any = null;
  let dadosNovos: any = null;
  let camposAlterados: any = null;

  if (action === "CREATE" || action === "RESTORE") {
    dadosNovos = instance.get({ plain: true });
  } else if (action === "UPDATE") {
    const current = instance.get({ plain: true });
    const changed = instance.previous() || {};
    dadosAnteriores = { ...current };
    for (const key of Object.keys(changed)) {
      dadosAnteriores[key] = changed[key];
    }
    dadosNovos = current;
    const changedList = instance.changed();
    camposAlterados = Array.isArray(changedList) ? changedList : [];
  } else if (action === "DELETE") {
    dadosAnteriores = instance.get({ plain: true });
  }

  try {
    await AuditLogModel.create(
      {
        tabela: tableName,
        registro_id: registroId,
        acao: action,
        dados_anteriores: sanitizarAuditoria(dadosAnteriores),
        dados_novos: sanitizarAuditoria(dadosNovos),
        campos_alterados: camposAlterados?.filter((campo: string) => !/senha|password|token|secret/i.test(campo)) ?? null,
        usuario: currentContext() ? autorAuditoria(currentContext()!.usuarioNome ?? 'Usuário', currentContext()!.usuarioId) : "sistema",
        organizacao_id:
          instance.getDataValue("organizacao_id") ?? currentOrgId() ?? null,
      },
      { transaction: options.transaction },
    );
  } catch (err) {
    console.error("Failed to save audit log:", err);
  }
};

sequelize.addHook("afterCreate", (instance: any, options: any) =>
  logAction("CREATE", instance, options),
);
sequelize.addHook("afterUpdate", (instance: any, options: any) =>
  logAction("UPDATE", instance, options),
);
sequelize.addHook("afterDestroy", (instance: any, options: any) =>
  logAction("DELETE", instance, options),
);
sequelize.addHook('afterRestore', (instance: any, options: any) => logAction('RESTORE', instance, options));
