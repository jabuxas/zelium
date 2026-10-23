import { Router } from "express";
import {
  PatrimonioFotoController,
  uploadFotoMiddleware,
} from "../controllers/PatrimonioFotoController";
import { authorize } from "../middlewares/auth";

const router = Router({ mergeParams: true });

router.get("/", PatrimonioFotoController.list);
router.post("/", authorize("gestor", "responsavel", "conferente"), uploadFotoMiddleware, PatrimonioFotoController.create);
router.patch("/:fotoId/principal", authorize("gestor", "responsavel", "conferente"), PatrimonioFotoController.setPrincipal);
router.patch("/:fotoId", authorize("gestor", "responsavel", "conferente"), PatrimonioFotoController.update);
router.delete("/:fotoId", authorize("gestor", "responsavel", "conferente"), PatrimonioFotoController.remove);

export default router;
