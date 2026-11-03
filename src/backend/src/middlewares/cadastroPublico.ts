import { NextFunction, Request, Response } from 'express';
import { smtpConfigurado } from '../config/mail';

export function cadastroHabilitado(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (process.env.SELF_SERVICE_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Recurso indisponivel' });
  }
  try {
    const url = new URL(process.env.SELF_SERVICE_CONFIRMATION_URL ?? '');
    // Produção exige HTTPS fixo; loopback aceita http (dev/E2E local sem TLS).
    const loopback = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname);
    const segura = url.protocol === 'https:' || (url.protocol === 'http:' && loopback);
    if (!segura || url.username || url.password || url.search || url.hash || !smtpConfigurado()) {
      throw new Error('Configuracao insegura');
    }
    res.locals.confirmationUrl = url.toString();
    next();
  } catch {
    res.status(503).json({ error: 'Cadastro temporariamente indisponivel' });
  }
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
