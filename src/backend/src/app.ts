import express, { NextFunction, Request, Response } from "express";
import routes from "./routes";
import { ReferenciaDeOutraOrganizacaoError } from "./context/errors";
import { authenticate, withUserContext } from './middlewares/auth';
import { PatrimonioFotoController } from './controllers/PatrimonioFotoController';

const app = express();

// A stack de produção roda atrás do Caddy: req.ip passa a ser o cliente real
// (X-Forwarded-For do primeiro proxy), exigido pelo rate limit do login.
app.set("trust proxy", 1);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  next();
});

app.use(express.json());

app.get('/uploads/patrimonios/:filename', authenticate, withUserContext, PatrimonioFotoController.file);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", routes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ReferenciaDeOutraOrganizacaoError) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

export default app;
