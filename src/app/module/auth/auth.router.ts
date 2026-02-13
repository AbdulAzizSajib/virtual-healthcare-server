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
authRouter.post(
  "/change-password",
  checkAuth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
  authController.changePassword,
);
authRouter.post(
  "/logout",
  checkAuth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
  authController.logoutUser,
);

authRouter.post("/verify-email", authController.verifyEmail);

authRouter.post("/forget-password", authController.forgetPassword);
authRouter.post("/reset-password", authController.resetPassword);

//

authRouter.get("/login/google", authController.googleLogin);
authRouter.get("/google/success", authController.googleLoginSuccess);
authRouter.get("/oauth/error", authController.handleOAuthError);

export default authRouter;
