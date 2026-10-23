import { Router } from "express";
import { AmbienteController } from "../controllers/AmbienteController";
import { authorize } from "../middlewares/auth";

const router = Router();

router.get("/", AmbienteController.findAll);
router.get("/deletados", AmbienteController.listDeletados);
router.patch("/:id/restaurar", authorize("gestor", "responsavel"), AmbienteController.restaurar);
router.patch("/:id/localizacao", AmbienteController.updateLocalizacao);
router.delete("/:id/localizacao", AmbienteController.clearLocalizacao);
router.get("/:id", AmbienteController.findById);
router.post("/", authorize("gestor", "responsavel"), AmbienteController.create);
router.put("/:id", authorize("gestor", "responsavel"), AmbienteController.update);
router.delete("/:id", authorize("gestor", "responsavel"), AmbienteController.delete);

export default router;
