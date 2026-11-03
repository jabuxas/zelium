import { Router } from "express";
import ambienteRoutes from "./ambiente.routes";
import conferenteRoutes from "./conferente.routes";
import estadoItemRoutes from "./estadoItem.routes";
import fornecedoresRoutes from "./fornecedores.routes";
import patrimonioRoutes from "./patrimonio.routes";
import responsavelRoutes from "./responsavel.routes";
import tipoMaterialRoutes from "./tipoMaterial.routes";
import auditLogRoutes from "./auditLog.routes";
import solicitacaoRoutes from "./solicitacao.routes";
import authRoutes from "./auth.routes";
import usuarioRoutes from "./usuario.routes";
import notificacaoRoutes from "./notificacao.routes";
import relatorioRoutes from "./relatorio.routes";
import { authenticate, withUserContext } from "../middlewares/auth";
import { exigirTrialValido } from "../middlewares/trial";
import { exigirCsrfParaCookie } from "../middlewares/csrf";

const router = Router();

// Login e sessão: acesso público (login) e leitura do usuário logado
router.use("/auth", authRoutes);

// A partir daqui, toda rota exige um token JWT válido e roda dentro do
// contexto da organização do usuário (isolamento multiempresa)
router.use(authenticate);
router.use(withUserContext);

// Trial expirada bloqueia escritas de negócio (leituras/exportações seguem
// por perfil). Consulta a organização só em POST/PUT/PATCH/DELETE.
router.use(exigirTrialValido);

// Defesa CSRF: requisições autenticadas POR COOKIE em métodos de escrita
// exigem X-Requested-With (header customizado = preflight = allowlist CORS).
// Autenticação por Bearer (mobile/API) é isenta por natureza.
router.use(exigirCsrfParaCookie);

router.use("/ambientes", ambienteRoutes);
router.use("/conferentes", conferenteRoutes);
router.use("/estados-item", estadoItemRoutes);
router.use("/fornecedores", fornecedoresRoutes);
router.use("/patrimonios", patrimonioRoutes);
router.use("/responsaveis", responsavelRoutes);
router.use("/tipo-material", tipoMaterialRoutes);
router.use("/audit-log", auditLogRoutes);
router.use("/solicitacoes", solicitacaoRoutes);
router.use("/usuarios", usuarioRoutes);
router.use("/notificacoes", notificacaoRoutes);
router.use("/relatorios", relatorioRoutes);

export default router;
