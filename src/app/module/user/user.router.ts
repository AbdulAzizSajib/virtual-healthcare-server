import { Router } from "express";
import { userController } from "./user.controller";

import { validateRequest } from "../../middleware/validateRequest";
import { UserValidation } from "./user.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const userRouter = Router();

userRouter.post(
  "/create-doctor",
  checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
  validateRequest(UserValidation.createDoctorValidationSchema),
  userController.createDoctor,
);
userRouter.post(
  "/create-admin",
  checkAuth(Role.SUPER_ADMIN),
  validateRequest(UserValidation.createAdminValidationSchema),
  userController.createAdmin,
);

userRouter.post(
  "/create-super-admin",
  checkAuth(Role.SUPER_ADMIN),
  validateRequest(UserValidation.createSuperAdminValidationSchema),
  userController.createSuperAdmin,
);

export default userRouter;
