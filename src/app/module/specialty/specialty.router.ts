import { Router } from "express";
import { specialtyController } from "./specialty.controller";

const specialtyRouter = Router();

specialtyRouter.post("/", specialtyController.createSpecialty);
specialtyRouter.get("/", specialtyController.getAllSpecialties);
specialtyRouter.delete("/:id", specialtyController.deleteSpecialty);

export { specialtyRouter };
