import { Router } from "express";
import { TipoMaterialController } from "../controllers/TipoMaterialController";
import { authorize } from "../middlewares/auth";

const router = Router();

router.get("/", TipoMaterialController.findAll);
router.get("/deletados", TipoMaterialController.listDeletados);
router.patch("/:id/restaurar", authorize("gestor"), TipoMaterialController.restaurar);
router.get("/:id", TipoMaterialController.findById);
router.post("/", authorize("gestor"), TipoMaterialController.create);
router.put("/:id", authorize("gestor"), TipoMaterialController.update);
router.delete("/:id", authorize("gestor"), TipoMaterialController.delete);

export default router;
