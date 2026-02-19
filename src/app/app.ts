/* eslint-disable @typescript-eslint/no-explicit-any */

import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { specialtyRouter } from "./module/specialty/specialty.router";
import authRouter from "./module/auth/auth.router";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { notFoundMiddleware } from "./middleware/notFound";
import userRouter from "./module/user/user.router";
import doctorRouter from "./module/doctor/doctor.router";
import adminRouter from "./module/admin/admin.router";
import { auth } from "./lib/auth";
import { toNodeHandler } from "better-auth/node";
import path from "path";
import qs from "qs";
import { envVars } from "./config/env";
import scheduleRouter from "./module/schedule/schedule.router";
import doctorScheduleRouter from "./module/doctorSchedule/doctorSchedule.router";
import { PaymentController } from "./module/payment/payment.controller";
import { AppointmentService } from "./module/appointment/appointment.service";
import cron from "node-cron";
import AppointmentRouter from "./module/appointment/appointment.router";

const app = express();

app.set("query parser", (str: string) => qs.parse(str));

app.set("view engine", "ejs");
app.set("views", path.resolve(process.cwd(), `src/app/templates`));

//  stripe

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  // async (req: Request, res: Response) => {
  //   console.log("Webhook received:", req.body);
  //   res.status(200).send("Webhook received");
  // },
  PaymentController.handleStripeWebhookEvent,
);

app.use(
  cors({
    origin: [
      envVars.FRONTEND_URL,
      envVars.BETTER_AUTH_URL,
      "http://localhost:3000",
      "http://localhost:5000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("/api/auth", toNodeHandler(auth));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// server health check
app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Server is running...");
});

cron.schedule("*/25 * * * *", async () => {
  try {
    console.log("Running cron job to cancel unpaid appointments...");
    await AppointmentService.cancelUnpaidAppointments();
  } catch (error: any) {
    console.error(
      "Error occurred while canceling unpaid appointments:",
      error.message,
    );
  }
});

app.use("/api/v1/specialties", specialtyRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/doctors", doctorRouter);
app.use("/api/v1/admins", adminRouter);
app.use("/api/v1/schedules", scheduleRouter);
app.use("/api/v1/doctor-schedules", doctorScheduleRouter);
app.use("/api/v1/appointments", AppointmentRouter);

app.use(globalErrorHandler);
app.use(notFoundMiddleware);

export default app;
