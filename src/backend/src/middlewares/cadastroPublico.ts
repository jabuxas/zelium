import { NextFunction, Request, Response } from 'express';
import { smtpConfigurado } from '../config/mail';
import { origensWebPermitidas } from '../config/sessao';

/** HTTPS fixo sem credenciais/query/fragmento; http só para loopback (dev/E2E). */
export function urlEmailValida(valor: string): boolean {
  try {
    const url = new URL(valor);
    const loopback = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
    const segura = url.protocol === 'https:' || (url.protocol === 'http:' && loopback);
    return segura && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

/** Verificação de ORIGEM em rotas públicas POST (login CSRF e afins).
 * Navegador SEMPRE envia Origin em POST: aceita mesma origem do Host
 * (produção same-origin pelo Caddy) ou allowlist WEB_ORIGINS (dev/E2E
 * cross-origin). Cliente não-navegador (mobile/API/scripts) não envia
 * Origin e passa — o cookie não os afeta. Um formulário forjado em outro
 * site traz o Origin do atacante e é recusado: SameSite=Lax impede o envio
 * do cookie antigo, mas NÃO impede o Set-Cookie da resposta de um POST
 * cross-site (login CSRF). */
export function verificarOrigem(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  const origem = req.headers.origin;
  if (!origem) return next();
  const permitida = (() => {
    try {
      return new URL(origem).host === req.headers.host
        || origensWebPermitidas().includes(origem);
    } catch {
      return false;
    }
  })();
  if (permitida) return next();
  return res.status(403).json({ error: 'Origem nao autorizada para esta operacao.', codigo: 'origem' });
}

export function cadastroHabilitado(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (process.env.SELF_SERVICE_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Recurso indisponivel' });
  }
  if (!urlEmailValida(process.env.SELF_SERVICE_CONFIRMATION_URL ?? '') || !smtpConfigurado()) {
    return res.status(503).json({ error: 'Cadastro temporariamente indisponivel' });
  }
  res.locals.confirmationUrl = new URL(process.env.SELF_SERVICE_CONFIRMATION_URL as string).toString();
  next();
}

/** Recuperação de senha: flag própria — beneficia contas existentes (piloto)
 * mesmo com o cadastro self-service fechado. Mesma exigência de URL/SMTP. */
export function recuperacaoHabilitado(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (process.env.RECUPERACAO_SENHA_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Recurso indisponivel' });
  }
  if (!urlEmailValida(process.env.RECUPERACAO_SENHA_URL ?? '') || !smtpConfigurado()) {
    return res.status(503).json({ error: 'Recuperacao temporariamente indisponivel' });
  }
  res.locals.confirmationUrl = new URL(process.env.RECUPERACAO_SENHA_URL as string).toString();
  next();
}

/** Conta inclusive sucesso e payload inválido, antes de trabalho caro.
 * Uma instância; capacidade limitada e falha fechada sob saturação. */
export function criarLimiteCadastro(maximo: number) {
  const registros = new Map<string, { quantidade: number; expira: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    const agora = Date.now();
    const ip = req.ip ?? req.socket.remoteAddress ?? 'desconhecido';
    const registro = registros.get(ip);
    if (registros.size >= 10_000) {
      for (const [chave, item] of registros) if (item.expira <= agora) registros.delete(chave);
    }
    if ((registro && registro.expira > agora && registro.quantidade >= maximo)
      || (!registros.has(ip) && registros.size >= 10_000)) {
      res.setHeader('Retry-After', String(registro ? Math.max(1, Math.ceil((registro.expira - agora) / 1000)) : 900));
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde antes de tentar novamente.' });
    }
    if (!registro || registro.expira <= agora) {
      registros.set(ip, { quantidade: 1, expira: agora + 15 * 60 * 1000 });
    } else {
      registro.quantidade += 1;
    }
    next();
  };
}
