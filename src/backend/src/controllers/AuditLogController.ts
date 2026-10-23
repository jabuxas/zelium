import { Request, Response, NextFunction } from 'express';
import { AuditFilterError, AuditLogService } from '../services/AuditLogService';
import { tabelasVisiveis } from '../services/auditData';

const service = new AuditLogService();

export const AuditLogController = {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await service.listar(req.query, req.user!.papel));
    } catch (err) {
      if (err instanceof AuditFilterError) return res.status(400).json({ error: err.message });
      next(err);
    }
  },

  async findByTableAndRecord(req: Request, res: Response, next: NextFunction) {
    const tabela = req.params.tabela.toLowerCase();
    const id = Number(req.params.registroId);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'registroId deve ser um inteiro positivo' });
    if (!tabelasVisiveis(req.user!.papel).includes(tabela)) return res.status(403).json({ error: 'Histórico indisponível para este perfil' });
    try {
      res.json(await service.historico(tabela, id));
    } catch (err) { next(err); }
  },
};
