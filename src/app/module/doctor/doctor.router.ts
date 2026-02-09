import { Router } from "express";
import { doctorController } from "./doctor.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const doctorRouter = Router();

doctorRouter.get(
  "/",
  checkAuth(Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  doctorController.getAllDoctors,
);
doctorRouter.get("/:id", doctorController.getDoctorById);
doctorRouter.patch("/:id", doctorController.updateDoctor);
doctorRouter.delete("/:id", doctorController.deleteDoctor);

export default doctorRouter;
