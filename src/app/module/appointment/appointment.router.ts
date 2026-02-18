import { Router } from "express";
import { AppointmentController } from "./appointment.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const AppointmentRouter = Router();

AppointmentRouter.post(
  "/book-appointment",
  checkAuth(Role.PATIENT),
  AppointmentController.bookAppointment,
);
AppointmentRouter.get(
  "/my-appointments",
  checkAuth(Role.PATIENT, Role.DOCTOR),
  AppointmentController.getMyAppointments,
);
AppointmentRouter.put(
  "/change-appointment-status/:id",
  checkAuth(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  AppointmentController.changeAppointmentStatus,
);
AppointmentRouter.get(
  "/my-single-appointment/:id",
  checkAuth(Role.PATIENT, Role.DOCTOR),
  AppointmentController.getMySingleAppointment,
);
AppointmentRouter.get(
  "/all-appointments",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  AppointmentController.getAllAppointments,
);
AppointmentRouter.post(
  "/book-appointment-with-pay-later",
  checkAuth(Role.PATIENT),
  AppointmentController.bookAppointmentWithPayLater,
);
AppointmentRouter.post(
  "/initiate-payment/:id",
  checkAuth(Role.PATIENT),
  AppointmentController.initiatePayment,
);
export default AppointmentRouter;
