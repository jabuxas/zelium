import { NextFunction, Request, Response } from "express";
import {
  FiltrosPatrimonios,
  gerarCsv,
  gerarPdf,
  RelatorioService,
  TipoRelatorio,
} from "../services/RelatorioService";

const service = new RelatorioService();

const TIPOS: TipoRelatorio[] = [
  "por-ambiente",
  "por-responsavel",
  "por-estado",
  "patrimonios",
];

function isTipoValido(tipo: unknown): tipo is TipoRelatorio {
  return typeof tipo === "string" && TIPOS.includes(tipo as TipoRelatorio);
}

function parseFiltros(req: Request): FiltrosPatrimonios {
  const filtros: FiltrosPatrimonios = {};
  const { ambiente_id, responsavel_id, estado_item_id, busca } = req.query;

  if (ambiente_id !== undefined) {
    filtros.ambiente_id = Number(ambiente_id);
  }
  if (responsavel_id !== undefined) {
    filtros.responsavel_id = Number(responsavel_id);
  }
  if (estado_item_id !== undefined) {
    filtros.estado_item_id = Number(estado_item_id);
  }
  if (typeof busca === "string" && busca.trim() !== "") {
    filtros.busca = busca.trim();
  }

  return filtros;
}

function nomeArquivo(tipo: TipoRelatorio): string {
  const data = new Date().toISOString().slice(0, 10);
  return `relatorio-${tipo}-${data}`;
}

export const RelatorioController = {
  async porAmbiente(_req: Request, res: Response) {
    res.json(await service.porAmbiente());
  },

  async porResponsavel(_req: Request, res: Response) {
    res.json(await service.porResponsavel());
  },

  async porEstado(_req: Request, res: Response) {
    res.json(await service.porEstado());
  },

  async patrimonios(req: Request, res: Response) {
    res.json(await service.patrimonios(parseFiltros(req)));
  },

  async exportarCsv(req: Request, res: Response, next: NextFunction) {
    const { tipo } = req.query;
    if (!isTipoValido(tipo)) {
      return res.status(400).json({ error: "tipo invalido" });
    }

    try {
      const { titulo, linhas } = await service.dadosDoRelatorio(
        tipo,
        parseFiltros(req)
      );
      const csv = gerarCsv(linhas as Record<string, unknown>[]);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${nomeArquivo(tipo)}.csv"`
      );
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },

  async exportarPdf(req: Request, res: Response, next: NextFunction) {
    const { tipo } = req.query;
    if (!isTipoValido(tipo)) {
      return res.status(400).json({ error: "tipo invalido" });
    }

    try {
      const { titulo, linhas } = await service.dadosDoRelatorio(
        tipo,
        parseFiltros(req)
      );
      const pdf = await gerarPdf(titulo, linhas as Record<string, unknown>[]);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${nomeArquivo(tipo)}.pdf"`
      );
      res.send(pdf);
    } catch (err) {
      next(err);
    }
  },
};
