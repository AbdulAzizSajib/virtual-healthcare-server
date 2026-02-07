import { Router } from "express";
import { userController } from "./user.controller";
import { createDoctorZodSchema } from "./user.validation";
import { validateRequest } from "../../middleware/validateRequest";

const userRouter = Router();

userRouter.post(
  "/create-doctor",
  validateRequest(createDoctorZodSchema),
  userController.createDoctor,
);

export default userRouter;
