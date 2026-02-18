import { Router } from "express";
import { AppointmentController } from "./appointment.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const appointmentRouter = Router();

appointmentRouter.post(
  "/book-appointment",
  checkAuth(Role.PATIENT),
  AppointmentController.bookAppointment,
);

appointmentRouter.get(
  "/my-appointments",
  checkAuth(Role.PATIENT, Role.DOCTOR),
  AppointmentController.getMyAppointments,
);
appointmentRouter.patch(
  "/change-appointment-status/:id",
  checkAuth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  AppointmentController.changeAppointmentStatus,
);
appointmentRouter.get(
  "/my-single-appointment/:id",
  checkAuth(Role.PATIENT, Role.DOCTOR),
  AppointmentController.getMySingleAppointment,
);
appointmentRouter.get(
  "/all-appointments",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AppointmentController.getAllAppointments,
);

export default appointmentRouter;
