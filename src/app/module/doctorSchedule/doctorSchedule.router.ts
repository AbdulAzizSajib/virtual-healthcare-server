import { Router } from "express";
import { DoctorScheduleController } from "./doctorSchedule.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const doctorScheduleRouter = Router();

doctorScheduleRouter.post(
  "/create-my-doctor-schedule",
  checkAuth(Role.DOCTOR),
  DoctorScheduleController.createMyDoctorSchedule,
);

doctorScheduleRouter.get(
  "/my-doctor-schedules",
  checkAuth(Role.DOCTOR),
  DoctorScheduleController.getMyDoctorSchedules,
);

doctorScheduleRouter.get(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  DoctorScheduleController.getAllDoctorSchedules,
);
doctorScheduleRouter.get(
  "/:doctorId/schedule/:scheduleId",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  DoctorScheduleController.getDoctorScheduleById,
);
doctorScheduleRouter.patch(
  "/update-my-doctor-schedule",
  checkAuth(Role.DOCTOR),
  DoctorScheduleController.updateMyDoctorSchedule,
);
doctorScheduleRouter.delete(
  "/delete-my-doctor-schedule/:id",
  checkAuth(Role.DOCTOR),
  DoctorScheduleController.deleteMyDoctorSchedule,
);

export default doctorScheduleRouter;
