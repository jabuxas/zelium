import { NextFunction, Request, Response } from "express";
import { ForeignKeyConstraintError, UniqueConstraintError } from "sequelize";
import { PatrimonioService } from "../services/PatrimonioService";
import { gerarQrCodeSvg, qrConteudoPatrimonio } from "../utils/qrcode";
import {
  camposDepreciacaoDoCorpo,
  validarCamposDepreciacao,
} from "../validation/depreciacao";

const service = new PatrimonioService();

function mensagemDe(erros: { campo: string; mensagem: string }[]): string {
  // A primeira mensagem preserva o texto que o frontend já conhece.
  return erros[0]?.mensagem ?? "Dados invalidos";
}

function textoHtml(value: unknown): string {
  const entidades: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, character => entidades[character]);
}

export const PatrimonioController = {
  async findAll(req: Request, res: Response) {
    const { numero } = req.query;
    const items = await service.findAll(
      typeof numero === "string" && numero.trim() !== ""
        ? { numero: numero.trim() }
        : {}
    );
    res.json(items);
  },

  async findById(req: Request, res: Response) {
    const item = await service.findById(Number(req.params.id));
    if (!item) return res.status(404).json({ error: "Patrimonio nao encontrado" });
    res.json(item);
  },

  async historicoEstado(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await service.findHistoricoEstado(Number(req.params.id));
      res.json(items);
    } catch (err) {
      next(err);
    }
  },

  async qrCode(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await service.findById(Number(req.params.id));
      if (!item) return res.status(404).json({ error: "Patrimonio nao encontrado" });

      const svg = await gerarQrCodeSvg(
        qrConteudoPatrimonio(String(item.numero_patrimonio))
      );
      res.type("image/svg+xml").send(svg);
    } catch (err) {
      next(err);
    }
  },

  async etiqueta(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await service.findById(Number(req.params.id));
      if (!item) return res.status(404).json({ error: "Patrimonio nao encontrado" });

      const svg = await gerarQrCodeSvg(
        qrConteudoPatrimonio(String(item.numero_patrimonio))
      );
      const numero = textoHtml(item.numero_patrimonio);
      const descricao = textoHtml(item.descricao);

      res.type("text/html").send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Etiqueta ${numero}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; }
  .etiqueta { width: 320px; border: 2px solid #111827; border-radius: 12px; padding: 16px; }
  .marca { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #6b7280; }
  .numero { font-size: 22px; font-weight: 700; margin: 4px 0; }
  .descricao { font-size: 13px; color: #374151; margin-bottom: 10px; }
  .qr { text-align: center; }
  .qr svg { width: 160px; height: 160px; }
  @media print { .nao-imprimir { display: none; } }
</style>
</head>
<body>
  <div class="etiqueta">
    <div class="marca">Zelium &middot; Gestão Patrimonial</div>
    <div class="numero">${numero}</div>
    <div class="descricao">${descricao}</div>
    <div class="qr">${svg}</div>
  </div>
  <button class="nao-imprimir" onclick="window.print()">Imprimir etiqueta</button>
</body>
</html>`);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    const {
      numero_patrimonio,
      descricao,
      valor,
      tipo_material_id,
      estado_item_id,
      ambiente_id,
      responsavel_id,
    } = req.body;

    if (!numero_patrimonio || String(numero_patrimonio).trim() === "") {
      return res.status(400).json({ error: "numero_patrimonio e obrigatorio" });
    }
    if (!descricao || String(descricao).trim() === "") {
      return res.status(400).json({ error: "descricao e obrigatoria" });
    }
    if (valor === undefined || valor === null || isNaN(Number(valor)) || Number(valor) < 0) {
      return res.status(400).json({ error: "valor e obrigatorio e deve ser um numero nao negativo" });
    }
    if (!tipo_material_id) {
      return res.status(400).json({ error: "tipo_material_id e obrigatorio" });
    }
    if (!estado_item_id) {
      return res.status(400).json({ error: "estado_item_id e obrigatorio" });
    }
    if (!ambiente_id) {
      return res.status(400).json({ error: "ambiente_id e obrigatorio" });
    }
    if (!responsavel_id) {
      return res.status(400).json({ error: "responsavel_id e obrigatorio" });
    }

    // Campos de depreciação (opcionais) — MESMA validação da edição.
    const erros = validarCamposDepreciacao(camposDepreciacaoDoCorpo(req.body));
    if (erros.length > 0) {
      return res.status(400).json({ error: mensagemDe(erros), erros });
    }

    try {
      const item = await service.create(req.body);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        return res.status(409).json({ error: "Ja existe um patrimonio cadastrado com este numero" });
      }
      if (err instanceof ForeignKeyConstraintError) {
        return res.status(400).json({ error: "Referencia invalida: verifique tipo_material, estado_item, ambiente, responsavel ou fornecedor" });
      }
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const campos = camposDepreciacaoDoCorpo(req.body);
      let persistidos = {};
      const precisaPersistidos =
        (campos.valor_residual !== undefined && campos.valor === undefined) ||
        (campos.valor !== undefined && campos.valor_residual === undefined);
      if (precisaPersistidos) {
        const atual = await service.findById(Number(req.params.id));
        if (!atual) return res.status(404).json({ error: "Patrimonio nao encontrado" });
        persistidos = { valor: atual.valor, valor_residual: atual.valor_residual };
      }

      // PUT do formulário web envia nulls explícitos: validação idêntica ao
      // cadastro, com combinações contra o registro persistido.
      const erros = validarCamposDepreciacao(campos, persistidos);
      if (erros.length > 0) {
        return res.status(400).json({ error: mensagemDe(erros), erros });
      }

      const item = await service.update(Number(req.params.id), req.body);
      if (!item) return res.status(404).json({ error: "Patrimonio nao encontrado" });
      res.json(item);
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        return res.status(409).json({ error: "Ja existe um patrimonio cadastrado com este numero" });
      }
      if (err instanceof ForeignKeyConstraintError) {
        return res.status(400).json({ error: "Referencia invalida: verifique tipo_material, estado_item, ambiente, responsavel ou fornecedor" });
      }
      next(err);
    }
  },

  async listDeletados(_req: Request, res: Response, next: NextFunction) {
    try {
      const items = await service.findDeleted();
      res.json(items);
    } catch (err) {
      next(err);
    }
  },

  async restaurar(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await service.restore(Number(req.params.id));
      if (!item) return res.status(404).json({ error: "Patrimonio nao encontrado" });
      res.json(item);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await service.delete(Number(req.params.id));
      if (!deleted) return res.status(404).json({ error: "Patrimonio nao encontrado" });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
