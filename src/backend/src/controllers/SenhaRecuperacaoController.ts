import { Request, Response } from 'express';
import { SenhaRecuperacaoService } from '../services/SenhaRecuperacaoService';
import { validarConfirmacao, validarPedidoRecuperacao } from '../services/cadastroValidation';

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

  async redefinir(req: Request, res: Response) {
    const dados = validarConfirmacao(req.body);
    if (!dados) return res.status(400).json({ error: 'Informe token valido e senha de 12 caracteres a 72 bytes, sem campos adicionais' });
    if (!await service.redefinir(dados.token, dados.senha)) {
      return res.status(400).json({ error: 'Redefinicao invalida ou expirada. Solicite recuperacao novamente.' });
    }
    return res.status(200).json({ message: 'Senha redefinida. Faca login com a nova senha.' });
  },
};
