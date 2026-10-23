import { NextFunction, Request, Response } from "express";
import { DepreciacaoService } from "../services/DepreciacaoService";

const service = new DepreciacaoService();

export const DepreciacaoController = {
  async detalhe(req: Request, res: Response, next: NextFunction) {
    try {
      const detalhe = await service.detalhe(Number(req.params.id));
      if (!detalhe) {
        return res.status(404).json({ error: "Patrimonio nao encontrado" });
      }
      res.json(detalhe);
    } catch (err) {
      next(err);
    }
  },

  async financeiro(_req: Request, res: Response, next: NextFunction) {
    try {
      const resumo = await service.resumoFinanceiro();
      res.json(resumo);
    } catch (err) {
      next(err);
    }
  },
};
