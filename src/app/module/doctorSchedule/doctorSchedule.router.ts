import { Router } from "express";
import { DoctorScheduleController } from "./doctorSchedule.controller";

const doctorScheduleRouter = Router();

doctorScheduleRouter.post("/", DoctorScheduleController.createMyDoctorSchedule);

export default doctorScheduleRouter;
