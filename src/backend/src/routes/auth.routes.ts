import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middlewares/auth";
import { exigirCsrfParaCookie } from "../middlewares/csrf";
import { rateLimitLogin } from "../middlewares/rateLimitLogin";
import { CadastroController } from '../controllers/CadastroController';
import { cadastroHabilitado, criarLimiteCadastro } from '../middlewares/cadastroPublico';

const router = Router();

// Login: acesso público — força bruta é limitada por IP (só falha 401 conta)
router.post("/login", rateLimitLogin, AuthController.login);
router.get("/me", authenticate, AuthController.me);
// Logout do navegador: sessão válida + header CSRF quando autenticado por cookie
router.post("/logout", authenticate, exigirCsrfParaCookie, AuthController.logout);
router.post('/cadastros', cadastroHabilitado, criarLimiteCadastro(5), CadastroController.solicitar);
router.post('/cadastros/confirmacao', cadastroHabilitado, criarLimiteCadastro(10), CadastroController.confirmar);

export default router;
