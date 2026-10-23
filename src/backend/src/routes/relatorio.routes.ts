import { Router } from "express";
import { RelatorioController } from "../controllers/RelatorioController";
import { authorize } from "../middlewares/auth";

const router = Router();

router.use(authorize("gestor", "responsavel"));

router.get("/por-ambiente", RelatorioController.porAmbiente);
router.get("/por-responsavel", RelatorioController.porResponsavel);
router.get("/por-estado", RelatorioController.porEstado);
router.get("/patrimonios", RelatorioController.patrimonios);
router.get("/exportar/csv", RelatorioController.exportarCsv);
router.get("/exportar/pdf", RelatorioController.exportarPdf);

export default router;
