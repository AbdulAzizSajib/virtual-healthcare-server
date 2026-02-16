import { Router } from "express";
import { ScheduleController } from "./schedule.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { ScheduleValidation } from "./schedule.validation";

const scheduleRouter = Router();

scheduleRouter.post(
  "/",
  validateRequest(ScheduleValidation.createScheduleZodSchema),
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ScheduleController.createSchedule,
);
scheduleRouter.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR),
  ScheduleController.getAllSchedules,
);
scheduleRouter.get(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR),
  ScheduleController.getScheduleById,
);
scheduleRouter.patch(
  "/:id",
  validateRequest(ScheduleValidation.updateScheduleZodSchema),
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  ScheduleController.updateSchedule,
);
scheduleRouter.delete(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR),
  ScheduleController.deleteSchedule,
);

export default scheduleRouter;
