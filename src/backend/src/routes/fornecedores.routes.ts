import { Router } from "express";
import { FornecedorController } from "../controllers/FornecedoresController";
import { authorize } from "../middlewares/auth";

const router = Router();

router.get("/", FornecedorController.findAll);
router.get("/deletados", FornecedorController.listDeletados);
router.patch("/:id/restaurar", authorize("gestor"), FornecedorController.restaurar);
router.get("/:id", FornecedorController.findById);
router.post("/", authorize("gestor"), FornecedorController.create);
router.put("/:id", authorize("gestor"), FornecedorController.update);
router.delete("/:id", authorize("gestor"), FornecedorController.delete);

export default router;
