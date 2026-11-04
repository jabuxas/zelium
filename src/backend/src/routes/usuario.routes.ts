import { Router } from "express";
import { UsuarioController } from "../controllers/AuthController";
import { authorize } from "../middlewares/auth";

const router = Router();

// Troca da própria senha: qualquer perfil autenticado; guard CSRF global
// cobre a via cookie. Sessões antigas são revogadas pelo bump de versão.
router.post("/senha", UsuarioController.alterarSenhaPropia);
router.get("/", authorize("gestor"), UsuarioController.findAll);
router.get("/:id", authorize("gestor"), UsuarioController.findById);
router.post("/", authorize("gestor"), UsuarioController.create);
router.put("/:id", authorize("gestor"), UsuarioController.update);
router.delete("/:id", authorize("gestor"), UsuarioController.delete);

export default router;
