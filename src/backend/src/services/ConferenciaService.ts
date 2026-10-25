import { Conferencia } from "../models/Conferencia";
import { EstadoItem } from "../models/EstadoItem";
import { Patrimonio } from "../models/Patrimonio";
import { currentContext, DEFAULT_ORG_ID } from "../context/requestContext";
import { PatrimonioService } from "./PatrimonioService";
import { sequelize } from '../database/connection';

export interface CriarConferenciaData {
  patrimonio_id: number;
  estado_item_id?: number | null;
  observacao?: string | null;
}

const patrimonioService = new PatrimonioService();

export class ConferenciaService {
  async findByPatrimonio(patrimonioId: number) {
    return Conferencia.findAll({
      where: { patrimonio_id: patrimonioId },
      order: [["created_at", "DESC"]],
    });
  }

  /**
   * Registra a conferência física e, quando um estado é informado,
   * atualiza o estado atual do patrimônio (fluxo de inventário em campo).
   * A atualização de estado passa pelo PatrimonioService, que dispara a
   * notificação de avaria quando aplicável.
   */
  async create(data: CriarConferenciaData) {
    const ctx = currentContext();
    return sequelize.transaction(async transaction => {
      const estadoValido =
        data.estado_item_id === undefined ||
        data.estado_item_id === null ||
        (await EstadoItem.findByPk(data.estado_item_id, { transaction })) !== null;

      const conferencia = await Conferencia.create({
        organizacao_id: ctx?.organizacaoId ?? DEFAULT_ORG_ID,
        patrimonio_id: data.patrimonio_id,
        usuario_id: ctx?.usuarioId ?? 0,
        estado_item_id: estadoValido ? data.estado_item_id ?? null : null,
        observacao: data.observacao ?? null,
      }, { transaction });

      if (estadoValido && data.estado_item_id) {
        await patrimonioService.update(data.patrimonio_id, {
          estado_item_id: data.estado_item_id,
        }, transaction);
      }

      return conferencia;
    });
  }
}
