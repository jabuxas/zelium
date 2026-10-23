import { CreationAttributes } from 'sequelize';
import { Patrimonio } from '../models/Patrimonio';
import { Solicitacao, SolicitacaoStatus, SolicitacaoTipo } from '../models/Solicitacao';
import { SolicitacaoFilters, SolicitacaoRepository } from '../repositories/SolicitacaoRepository';
import { NotificacaoService } from './NotificacaoService';

const notificacoes = new NotificacaoService();

const TIPO_LABEL: Record<SolicitacaoTipo, string> = {
  manutencao: 'manutenção',
  substituicao: 'substituição',
};

const STATUS_LABEL: Record<SolicitacaoStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export class SolicitacaoService {
  private repo = new SolicitacaoRepository();

  findAll(filters: SolicitacaoFilters = {}) {
    return this.repo.findAll(filters);
  }

  findById(id: number) {
    return this.repo.findById(id);
  }

  /**
   * Cria a solicitação e dispara e-mail automático ao responsável do
   * patrimônio e aos gestores da organização.
   */
  async create(data: CreationAttributes<Solicitacao>) {
    const solicitacao = await this.repo.create(data);

    const patrimonio = await Patrimonio.findByPk(data.patrimonio_id);
    if (patrimonio) {
      void notificacoes.notificar({
        tipo: 'solicitacao_criada',
        assunto: `Solicitação de ${TIPO_LABEL[data.tipo]} aberta: ${patrimonio.numero_patrimonio}`,
        corpo:
          `Foi aberta uma solicitação de ${TIPO_LABEL[data.tipo]} para o patrimônio ` +
          `${patrimonio.numero_patrimonio} (${patrimonio.descricao}).\n\n` +
          `Descrição: ${data.descricao ?? '—'}\n` +
          `Status inicial: Aberta. Acompanhe no sistema.`,
        responsavelId: patrimonio.responsavel_id,
      });
    }

    return solicitacao;
  }

  update(id: number, data: Partial<CreationAttributes<Solicitacao>>) {
    return this.repo.update(id, data);
  }

  /**
   * Atualiza o status e notifica por e-mail a mudança.
   */
  async updateStatus(id: number, status: SolicitacaoStatus) {
    const solicitacao = await this.repo.findById(id);
    const atualizada = await this.repo.update(id, { status });
    if (!solicitacao || !atualizada) return atualizada;

    const patrimonio = await Patrimonio.findByPk(solicitacao.patrimonio_id);
    if (patrimonio) {
      void notificacoes.notificar({
        tipo: 'solicitacao_status',
        assunto: `Solicitação ${patrimonio.numero_patrimonio}: ${STATUS_LABEL[status]}`,
        corpo:
          `A solicitação de ${TIPO_LABEL[solicitacao.tipo]} do patrimônio ` +
          `${patrimonio.numero_patrimonio} (${patrimonio.descricao}) mudou de status: ` +
          `${STATUS_LABEL[solicitacao.status as SolicitacaoStatus]} → ${STATUS_LABEL[status]}.`,
        responsavelId: patrimonio.responsavel_id,
      });
    }

    return atualizada;
  }

  delete(id: number) {
    return this.repo.delete(id);
  }
}
