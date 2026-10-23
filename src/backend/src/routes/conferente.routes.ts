import { Router } from "express";
import { ConferenteController } from "../controllers/ConferenteController";
import { authorize } from "../middlewares/auth";

const router = Router();

router.get("/", ConferenteController.findAll);
router.get("/deletados", ConferenteController.listDeletados);
router.patch("/:id/restaurar", authorize("gestor"), ConferenteController.restaurar);
router.get("/:id", ConferenteController.findById);
router.post("/", authorize("gestor"), ConferenteController.create);
router.put("/:id", authorize("gestor"), ConferenteController.update);
router.delete("/:id", authorize("gestor"), ConferenteController.delete);

export default router;
