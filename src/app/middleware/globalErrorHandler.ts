/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import app from "../app";
import { envVars } from "../config/env";
import status from "http-status";

//  global error handler

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  //   console.error("Global error handler:", err);
  if (envVars.NODE_ENV === "development") {
    console.error("Error from Global Error Handler:", err);
  }
  const statusCode: number = status.INTERNAL_SERVER_ERROR;
  const message: string = "Internal Server Error";
  res.status(statusCode).json({
    success: false,
    message: message,
    error: err.message || "Internal Server Error",
  });
};
