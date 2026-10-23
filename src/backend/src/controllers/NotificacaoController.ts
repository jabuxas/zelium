import { Request, Response } from "express";
import { NotificacaoService } from "../services/NotificacaoService";

const service = new NotificacaoService();

export const NotificacaoController = {
  async findAll(req: Request, res: Response) {
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
    const notificacoes = await service.listar(limit);
    res.json(notificacoes);
  },
};
