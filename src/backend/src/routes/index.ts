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

const router = Router();

// Login e sessão: acesso público (login) e leitura do usuário logado
router.use("/auth", authRoutes);

// A partir daqui, toda rota exige um token JWT válido e roda dentro do
// contexto da organização do usuário (isolamento multiempresa)
router.use(authenticate);
router.use(withUserContext);

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
