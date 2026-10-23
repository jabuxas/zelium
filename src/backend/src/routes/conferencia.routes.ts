import { Router } from "express";
import { ConferenciaController } from "../controllers/ConferenciaController";
import { authorize } from "../middlewares/auth";

const router = Router({ mergeParams: true });

router.get("/", ConferenciaController.findByPatrimonio);
router.post(
  "/",
  authorize("gestor", "responsavel", "conferente"),
  ConferenciaController.create
);

export default router;
