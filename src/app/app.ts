import express, { Request, Response } from "express";
import cors from "cors";
import { specialtyRouter } from "./module/specialty/specialty.router";
import authRouter from "./module/auth/auth.router";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// server health check
app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Server is running...");
});

app.use("/api/v1/specialties", specialtyRouter);
app.use("/api/v1/auth", authRouter);

export default app;
