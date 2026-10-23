import { Router } from "express";
import { UsuarioController } from "../controllers/AuthController";
import { authorize } from "../middlewares/auth";

const router = Router();

router.get("/", authorize("gestor"), UsuarioController.findAll);
router.get("/:id", authorize("gestor"), UsuarioController.findById);
router.post("/", authorize("gestor"), UsuarioController.create);
router.put("/:id", authorize("gestor"), UsuarioController.update);
router.delete("/:id", authorize("gestor"), UsuarioController.delete);

export default router;
