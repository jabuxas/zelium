import { Router } from "express";
import { AuditLogController } from "../controllers/AuditLogController";
import { authorize } from "../middlewares/auth";

const router = Router();

router.use(authorize('gestor', 'responsavel', 'conferente'));
router.get("/", AuditLogController.findAll);
router.get("/:tabela/:registroId", AuditLogController.findByTableAndRecord);

export default router;
