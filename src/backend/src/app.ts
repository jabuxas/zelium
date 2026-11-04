import express, { NextFunction, Request, Response } from "express";
import routes from "./routes";
import { ReferenciaDeOutraOrganizacaoError } from "./context/errors";
import { authenticate, withUserContext } from './middlewares/auth';
import { PatrimonioFotoController } from './controllers/PatrimonioFotoController';
import { origensWebPermitidas } from './config/sessao';

const app = express();

// A stack de produção roda atrás do Caddy: req.ip passa a ser o cliente real
// (X-Forwarded-For do primeiro proxy), exigido pelo rate limit do login.
app.set("trust proxy", 1);

// CORS com credenciais (cookie de sessão): ACAO só para origens da allowlist
// — "Access-Control-Allow-Origin: *" é ilegal junto de credentials. Produção
// é same-origin pelo Caddy e não depende de CORS; dev/E2E usam portas locais.
// Mobile (React Native) não aplica CORS e segue por Bearer.
const origensPermitidas = origensWebPermitidas();
app.use((req, res, next) => {
  const origem = req.headers.origin;
  if (origem && origensPermitidas.includes(origem)) {
    res.header('Access-Control-Allow-Origin', origem);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.vary('Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  next();
});

app.use(express.json());

app.get('/uploads/patrimonios/:filename', authenticate, withUserContext, PatrimonioFotoController.file);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", routes);

// O erro do parser JSON pode carregar err.body (token e senha em claro).
// Os endpoints de acesso não podem cair no logger genérico de erros abaixo.
app.use('/api/auth/cadastros', (err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store');
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Corpo da requisicao excede o limite' });
  if (['entity.parse.failed', 'request.aborted', 'encoding.unsupported', 'charset.unsupported', 'request.size.invalid'].includes(err.type ?? '')) {
    return res.status(400).json({ error: 'Corpo da requisicao invalido' });
  }
  console.error('[cadastro] Falha ao processar requisicao');
  return res.status(500).json({ error: 'Erro interno do servidor' });
});

// Mesma proteção para o resto da API (login, troca/redefinição de senha...):
// erros do body-parser nunca chegam ao logger genérico. Outros erros seguem.
const ERROS_DE_CORPO = ['entity.parse.failed', 'entity.too.large', 'request.aborted', 'encoding.unsupported', 'charset.unsupported', 'request.size.invalid'];
app.use('/api', (err: Error & { type?: string }, _req: Request, res: Response, next: NextFunction) => {
  if (!ERROS_DE_CORPO.includes(err.type ?? '')) return next(err);
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Corpo da requisicao excede o limite' });
  return res.status(400).json({ error: 'Corpo da requisicao invalido' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ReferenciaDeOutraOrganizacaoError) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

export default app;
