import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { multerUpload } from "../../config/multer.config";
import { updateMyPatientProfileMiddleware } from "./patient.midlewares";
import { validateRequest } from "../../middleware/validateRequest";
import { PatientController } from "./patient.controller";
import { PatientValidation } from "./patient.validation";

const patientRouter = Router();

patientRouter.patch(
  "/update-my-profile",
  checkAuth(Role.PATIENT),
  multerUpload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "medicalReports", maxCount: 5 },
  ]),
  updateMyPatientProfileMiddleware,
  validateRequest(PatientValidation.updatePatientProfileZodSchema),
  PatientController.updateMyProfile,
);

export default patientRouter;
