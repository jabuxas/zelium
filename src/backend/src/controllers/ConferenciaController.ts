import { NextFunction, Request, Response } from "express";
import { ConferenciaService } from "../services/ConferenciaService";

const service = new ConferenciaService();

export const ConferenciaController = {
  async findByPatrimonio(req: Request, res: Response, next: NextFunction) {
    try {
      const conferencias = await service.findByPatrimonio(
        Number(req.params.patrimonioId)
      );
      res.json(conferencias);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    const patrimonioId = Number(req.params.patrimonioId);
    if (!Number.isInteger(patrimonioId) || patrimonioId <= 0) {
      return res.status(400).json({ error: "patrimonio invalido" });
    }

    const { estado_item_id, observacao } = req.body ?? {};
    if (
      estado_item_id !== undefined &&
      estado_item_id !== null &&
      (!Number.isInteger(Number(estado_item_id)) || Number(estado_item_id) <= 0)
    ) {
      return res.status(400).json({ error: "estado_item_id invalido" });
    }

    try {
      const conferencia = await service.create({
        patrimonio_id: patrimonioId,
        estado_item_id:
          estado_item_id === undefined || estado_item_id === null
            ? null
            : Number(estado_item_id),
        observacao:
          typeof observacao === "string" && observacao.trim() !== ""
            ? observacao.trim()
            : null,
      });
      res.status(201).json(conferencia);
    } catch (err) {
      next(err);
    }
  },
};
