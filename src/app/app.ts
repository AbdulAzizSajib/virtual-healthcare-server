import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { specialtyRouter } from "./module/specialty/specialty.router";
import authRouter from "./module/auth/auth.router";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import { notFoundMiddleware } from "./middleware/notFound";
import userRouter from "./module/user/user.router";
import doctorRouter from "./module/doctor/doctor.router";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// server health check
app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Server is running...");
});

app.use("/api/v1/specialties", specialtyRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/doctors", doctorRouter);

app.use(globalErrorHandler);
app.use(notFoundMiddleware);

export default app;
