import { Router } from "express";
import { ResponsavelController } from "../controllers/ResponsavelController";
import { authorize } from "../middlewares/auth";

const router = Router();

router.get("/", ResponsavelController.findAll);
router.get("/deletados", ResponsavelController.listDeletados);
router.patch("/:id/restaurar", authorize("gestor"), ResponsavelController.restaurar);
router.get("/:id", ResponsavelController.findById);
router.post("/", authorize("gestor"), ResponsavelController.create);
router.put("/:id", authorize("gestor"), ResponsavelController.update);
router.delete("/:id", authorize("gestor"), ResponsavelController.delete);

export default router;
