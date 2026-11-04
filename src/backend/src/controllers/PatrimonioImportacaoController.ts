import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { PatrimonioImportacaoService } from '../services/PatrimonioImportacaoService';

const service = new PatrimonioImportacaoService();

/** CSV em memória: arquivo pequeno por contrato (2 MB / 1000 linhas);
 * nada toca o disco de uploads das fotos. */
export const uploadImportacao = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
});

/** Multer entrega erros de limite ao next: traduzimos para 413/400 em vez
 * de deixar cair no handler global de 500. */
export function receberArquivoCsv(req: Request, res: Response, next: NextFunction) {
  uploadImportacao.single('arquivo')(req, res, (err: unknown) => {
    if (!err) return next();
    const codigo = (err as { code?: string }).code;
    if (codigo === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Arquivo acima do limite de 2 MB' });
    }
    return res.status(400).json({ error: 'Arquivo ilegível ou malformado' });
  });
}

function textoDoArquivo(req: Request): string | null {
  const arquivo = req.file as Express.Multer.File | undefined;
  if (!arquivo) return null;
  return (arquivo.buffer as Buffer).toString('utf8');
}

function erroAmigavel(err: unknown): { status: number; body: Record<string, unknown> } {
  const erro = err as Error & { codigo?: string; importacao?: unknown };
  if (erro.codigo === 'importacao_invalida') {
    return {
      status: 422,
      body: {
        error: erro.message,
        codigo: 'importacao_invalida',
        importacao: erro.importacao,
      },
    };
  }
  if (erro.constructor?.name === 'LimiteTrialAtingidoError') {
    return { status: 403, body: { error: erro.message, codigo: 'limite_trial' } };
  }
  const mensagem = erro.message || '';
  if (/colunas|CSV sem|Limite de .* linhas/i.test(mensagem)) {
    return { status: 400, body: { error: mensagem } };
  }
  console.error('[importacao] Falha ao processar arquivo');
  return { status: 503, body: { error: 'Importacao temporariamente indisponivel' } };
}

export const PatrimonioImportacaoController = {
  async preview(req: Request, res: Response, next: NextFunction) {
    const texto = textoDoArquivo(req);
    if (texto === null) return res.status(400).json({ error: 'Envie o arquivo CSV no campo "arquivo"' });
    try {
      const analise = await service.analisar(texto);
      const { linhasValidas: _ignoradas, ...visivel } = analise;
      return res.json(visivel);
    } catch (err) {
      const { status, body } = erroAmigavel(err);
      if (status < 500) return res.status(status).json(body);
      return next(err);
    }
  },

  async confirmar(req: Request, res: Response, next: NextFunction) {
    const texto = textoDoArquivo(req);
    if (texto === null) return res.status(400).json({ error: 'Envie o arquivo CSV no campo "arquivo"' });
    try {
      const resultado = await service.confirmar(texto);
      return res.status(201).json(resultado);
    } catch (err) {
      const { status, body } = erroAmigavel(err);
      if (status < 500) return res.status(status).json(body);
      return next(err);
    }
  },
};
