import { Router } from "express";
import { EstadoItemController } from "../controllers/EstadoItemController";
import { authorize } from "../middlewares/auth";

const router = Router();

router.get("/", EstadoItemController.findAll);
router.get("/deletados", EstadoItemController.listDeletados);
router.patch("/:id/restaurar", authorize("gestor"), EstadoItemController.restaurar);
router.get("/:id", EstadoItemController.findById);
router.post("/", authorize("gestor"), EstadoItemController.create);
router.put("/:id", authorize("gestor"), EstadoItemController.update);
router.delete("/:id", authorize("gestor"), EstadoItemController.delete);

export default router;
