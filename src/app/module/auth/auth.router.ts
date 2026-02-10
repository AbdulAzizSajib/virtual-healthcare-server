import { Router } from "express";
import { authController } from "./auth.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const authRouter = Router();

authRouter.post("/register", authController.registerPatient);
authRouter.post("/login", authController.loginUser);

authRouter.get(
  "/me",
  checkAuth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
  authController.getMe,
);
authRouter.post("/refresh-token", authController.getNewToken);

export default authRouter;
