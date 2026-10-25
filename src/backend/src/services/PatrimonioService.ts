import { CreationAttributes, Transaction } from 'sequelize';
import { Op } from 'sequelize';
import { AuditLog } from '../models/AuditLog';
import { Patrimonio } from '../models/Patrimonio';
import { PatrimonioFoto } from '../models/PatrimonioFoto';
import { EstadoItem } from '../models/EstadoItem';
import { PatrimonioRepository } from '../repositories/PatrimonioRepository';
import { NotificacaoService } from './NotificacaoService';

const fotoPrincipalInclude = {
  model: PatrimonioFoto,
  as: 'fotos',
  where: { principal: true },
  required: false,
  attributes: ['url'],
};

function withFotoPrincipal(patrimonio: Patrimonio): Record<string, unknown> {
  const json = patrimonio.get({ plain: true }) as Record<string, unknown>;
  const fotos = json.fotos as Array<{ url: string }> | undefined;
  json.foto_principal_url = fotos && fotos.length > 0 ? fotos[0].url : null;
  delete json.fotos;
  return json;
}

const notificacoes = new NotificacaoService();

export class PatrimonioService {
  private repo = new PatrimonioRepository();

  async findAll(filtros: { numero?: string } = {}) {
    const where = filtros.numero ? { numero_patrimonio: filtros.numero } : undefined;
    const items = await Patrimonio.findAll({
      where,
      include: [fotoPrincipalInclude],
      order: [['id', 'ASC']],
    });
    return items.map(withFotoPrincipal);
  }

  async findById(id: number) {
    const item = await Patrimonio.findByPk(id, { include: [fotoPrincipalInclude] });
    return item ? withFotoPrincipal(item) : null;
  }

  create(data: CreationAttributes<Patrimonio>) {
    return this.repo.create(data);
  }

  /**
   * Atualiza o patrimônio e, quando o estado muda para um estado marcado
   * como AVARIA, dispara e-mail automático para o responsável e gestores.
   */
  async update(id: number, data: Partial<CreationAttributes<Patrimonio>>, transaction?: Transaction) {
    const anterior = await Patrimonio.findByPk(id, { transaction });
    const atualizado = await this.repo.update(id, data, transaction);
    if (!atualizado || !anterior) return atualizado;

    const estadoMudou =
      data.estado_item_id !== undefined &&
      data.estado_item_id !== anterior.estado_item_id;

    if (estadoMudou) {
      const novoEstado = await EstadoItem.findByPk(data.estado_item_id, { transaction });
      if (novoEstado?.avaria) {
        const notificar = () => { void notificacoes.notificar({
          tipo: 'avaria',
          assunto: `Avaria reportada: patrimônio ${anterior.numero_patrimonio}`,
          corpo:
            `O patrimônio ${anterior.numero_patrimonio} (${anterior.descricao}) ` +
            `teve o estado alterado para "${novoEstado.nome}".\n\n` +
            `Verifique o item no sistema para dar andamento à manutenção ou substituição.`,
          responsavelId: anterior.responsavel_id,
        }); };
        if (transaction) transaction.afterCommit(notificar);
        else notificar();
      }
    }

    return atualizado;
  }

  delete(id: number) {
    return this.repo.delete(id);
  }

  findDeleted() {
    return this.repo.findDeleted();
  }

  restore(id: number) {
    return this.repo.restore(id);
  }

  async findHistoricoEstado(id: number) {
    const logs = await AuditLog.findAll({
      where: {
        tabela: 'patrimonio',
        registro_id: id,
        acao: 'UPDATE',
        campos_alterados: { [Op.contains]: ['estado_item_id'] },
      },
      order: [['created_at', 'ASC']],
    });

    return logs.map((log) => ({
      estado_anterior_id: log.dados_anteriores?.estado_item_id ?? null,
      estado_novo_id: log.dados_novos?.estado_item_id ?? null,
      data: log.created_at,
    }));
  }
}
