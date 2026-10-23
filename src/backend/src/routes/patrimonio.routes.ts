import { Router } from "express";
import { PatrimonioController } from "../controllers/PatrimonioController";
import { authorize } from "../middlewares/auth";
import patrimonioFotoRoutes from "./patrimonioFoto.routes";

const router = Router();

router.get("/", PatrimonioController.findAll);
router.get("/deletados", PatrimonioController.listDeletados);
router.patch("/:id/restaurar", authorize("gestor", "responsavel"), PatrimonioController.restaurar);
router.get("/:id/historico-estado", PatrimonioController.historicoEstado);
router.get("/:id", PatrimonioController.findById);
router.post("/", authorize("gestor", "responsavel"), PatrimonioController.create);
router.put("/:id", authorize("gestor", "responsavel"), PatrimonioController.update);
router.delete("/:id", authorize("gestor", "responsavel"), PatrimonioController.delete);

router.use("/:patrimonioId/fotos", patrimonioFotoRoutes);

export default router;
