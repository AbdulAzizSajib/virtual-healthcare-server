import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { userService } from "./user.service";

const createDoctor = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await userService.createDoctor(payload);
  sendResponse(res, {
    httpStatusCode: 201,
    success: true,
    message: "Doctor created successfully",
    data: result,
  });
});
const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await userService.createAdmin(payload);
  sendResponse(res, {
    httpStatusCode: 201,
    success: true,
    message: "Admin created successfully",
    data: result,
  });
});
const createSuperAdmin = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await userService.createSuperAdmin(payload);
  sendResponse(res, {
    httpStatusCode: 201,
    success: true,
    message: "Super Admin created successfully",
    data: result,
  });
});

export const userController = {
  createDoctor,
  createAdmin,
  createSuperAdmin,
};
