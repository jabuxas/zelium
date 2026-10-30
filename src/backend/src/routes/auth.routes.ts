import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middlewares/auth";
import { rateLimitLogin } from "../middlewares/rateLimitLogin";

const router = Router();

// Login: acesso público — força bruta é limitada por IP (só falha 401 conta)
router.post("/login", rateLimitLogin, AuthController.login);
router.get("/me", authenticate, AuthController.me);

export default router;
