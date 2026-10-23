import { Router } from "express";
import { NotificacaoController } from "../controllers/NotificacaoController";
import { authorize } from "../middlewares/auth";

const router = Router();

router.get("/", authorize("gestor"), NotificacaoController.findAll);

export default router;
