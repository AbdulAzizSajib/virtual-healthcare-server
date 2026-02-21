import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { checkAuth } from "../../middleware/checkAuth";
import { prescriptionController } from "./prescription.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { PrescriptionValidation } from "./prescription.validation";

const prescriptionRouter = Router();

prescriptionRouter.post(
  "/",
  checkAuth(Role.DOCTOR),
  validateRequest(PrescriptionValidation.createPrescriptionZodSchema),
  prescriptionController.givePrescription,
);

prescriptionRouter.get(
  "/",
  checkAuth(Role.SUPER_ADMIN, Role.ADMIN),
  prescriptionController.getAllPrescriptions,
);
prescriptionRouter.get(
  "/my-prescriptions",
  checkAuth(Role.PATIENT, Role.DOCTOR),
  prescriptionController.myPrescriptions,
);

prescriptionRouter.patch(
  "/:id",
  checkAuth(Role.DOCTOR),
  validateRequest(PrescriptionValidation.updatePrescriptionZodSchema),
  prescriptionController.updatePrescription,
);

prescriptionRouter.delete(
  "/:id",
  checkAuth(Role.DOCTOR),
  prescriptionController.deletePrescription,
);

export default prescriptionRouter;
