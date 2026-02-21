import { Router } from "express";
import { AdminController } from "./admin.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const adminRouter = Router();

adminRouter.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getAllAdmin,
);

adminRouter.get(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AdminController.getAdminById,
);

adminRouter.patch(
  "/change-user-status",
  checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
  AdminController.changeUserStatus,
);
adminRouter.patch(
  "/change-user-role",
  checkAuth(Role.SUPER_ADMIN),
  AdminController.changeUserRole,
);

export default adminRouter;
