import { Request, Response } from 'express';
import { SenhaRecuperacaoService } from '../services/SenhaRecuperacaoService';
import { validarPedidoRecuperacao } from '../services/cadastroValidation';

const service = new SenhaRecuperacaoService();
const MENSAGEM = 'Se o email pertencer a uma conta ativa, voce recebera um email com o link para definir uma nova senha.';

export const SenhaRecuperacaoController = {
  async solicitar(req: Request, res: Response) {
    const pedido = validarPedidoRecuperacao(req.body);
    if (!pedido) return res.status(400).json({ error: 'Informe um email valido, sem campos adicionais' });
    try {
      await service.solicitar(pedido.email, res.locals.confirmationUrl);
      return res.status(202).json({ message: MENSAGEM });
    } catch {
      // Sem repassar ao handler global: erros SQL/SMTP podem carregar dados
      // de acesso nos parâmetros (mesma disciplina do cadastro, ADR-0012).
      console.error('[senha] Falha ao processar solicitacao de recuperacao');
      return res.status(503).json({ error: 'Recuperacao temporariamente indisponivel' });
    }
  },
};
