import { Router } from "express";
import { AuditLogController } from "../controllers/AuditLogController";
import { authorize } from "../middlewares/auth";

const router = Router();

router.get("/", authorize("gestor"), AuditLogController.findAll);
router.get("/:tabela/:registroId", authorize("gestor"), AuditLogController.findByTableAndRecord);

export default router;
