import { Request, Response } from 'express';
import { CadastroService } from '../services/CadastroService';
import { validarPedidoCadastro } from '../services/cadastroValidation';

const service = new CadastroService();
const MENSAGEM = 'Se o cadastro puder prosseguir, enviaremos um email de confirmacao.';

export const CadastroController = {
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
