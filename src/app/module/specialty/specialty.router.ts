import { Router } from "express";
import { specialtyController } from "./specialty.controller";
import { multerUpload } from "../../config/multer.config";

const specialtyRouter = Router();

specialtyRouter.post(
  "/",
  multerUpload.single("file"),
  specialtyController.createSpecialty,
);
specialtyRouter.get("/", specialtyController.getAllSpecialties);
specialtyRouter.delete("/:id", specialtyController.deleteSpecialty);

export { specialtyRouter };
