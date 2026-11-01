import { Request, Response } from 'express';
import { CadastroService } from '../services/CadastroService';
import { validarConfirmacao, validarPedidoCadastro } from '../services/cadastroValidation';

const service = new CadastroService();
const MENSAGEM = 'Se o cadastro puder prosseguir, enviaremos um email de confirmacao.';

export const CadastroController = {
  async confirmar(req: Request, res: Response) {
    const dados = validarConfirmacao(req.body);
    if (!dados) return res.status(400).json({ error: 'Informe token valido e senha de 12 caracteres a 72 bytes, sem campos adicionais' });
    try {
      if (!await service.confirmar(dados.token, dados.senha)) {
        return res.status(400).json({ error: 'Confirmacao invalida ou expirada. Solicite novo cadastro.' });
      }
      return res.status(201).json({ message: 'Cadastro confirmado. Faca login para continuar.' });
    } catch {
      console.error('[cadastro] Falha ao confirmar cadastro');
      return res.status(503).json({ error: 'Cadastro temporariamente indisponivel' });
    }
  },

  async solicitar(req: Request, res: Response) {
    const pedido = validarPedidoCadastro(req.body);
    if (!pedido) return res.status(400).json({ error: 'Informe nome, email e organizacaoNome validos, sem campos adicionais' });
    try {
      await service.solicitar(pedido, res.locals.confirmationUrl);
      return res.status(202).json({ message: MENSAGEM });
    } catch {
      // Não repassar ao handler global: erros SQL/SMTP podem conter dados de
      // acesso nos parâmetros. Nenhum destinatário, payload ou erro bruto aqui.
      console.error('[cadastro] Falha ao processar solicitacao');
      return res.status(503).json({ error: 'Cadastro temporariamente indisponivel' });
    }
  },
};
