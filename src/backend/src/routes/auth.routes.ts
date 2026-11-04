import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middlewares/auth";
import { exigirCsrfParaCookie } from "../middlewares/csrf";
import { rateLimitLogin } from "../middlewares/rateLimitLogin";
import { CadastroController } from '../controllers/CadastroController';
import { SenhaRecuperacaoController } from '../controllers/SenhaRecuperacaoController';
import { cadastroHabilitado, criarLimiteCadastro, recuperacaoHabilitado } from '../middlewares/cadastroPublico';

const router = Router();

// Login: acesso público — força bruta é limitada por IP (só falha 401 conta)
router.post("/login", rateLimitLogin, AuthController.login);
router.get("/me", authenticate, AuthController.me);
// Logout do navegador: sessão válida + header CSRF quando autenticado por cookie
router.post("/logout", authenticate, exigirCsrfParaCookie, AuthController.logout);
router.post('/cadastros', cadastroHabilitado, criarLimiteCadastro(5), CadastroController.solicitar);
router.post('/cadastros/confirmacao', cadastroHabilitado, criarLimiteCadastro(10), CadastroController.confirmar);
router.post('/senha/recuperar', recuperacaoHabilitado, criarLimiteCadastro(5), SenhaRecuperacaoController.solicitar);
router.post('/senha/redefinir', recuperacaoHabilitado, criarLimiteCadastro(10), SenhaRecuperacaoController.redefinir);

export default router;
