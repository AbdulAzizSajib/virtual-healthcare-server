import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";

import status from "http-status";
import { sendResponse } from "../../shared/sendResponse";
import { AppointmentService } from "./appointment.service";

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const user = req.user;
  const appointment = await AppointmentService.bookAppointment(payload, user);
  sendResponse(res, {
    success: true,
    httpStatusCode: status.CREATED,
    message: "Appointment booked successfully",
    data: appointment,
  });
});

const getMyAppointments = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const appointments = await AppointmentService.getMyAppointments(user);
  sendResponse(res, {
    success: true,
    httpStatusCode: status.OK,
    message: "Appointments retrieved successfully",
    data: appointments,
  });
});

const changeAppointmentStatus = catchAsync(
  async (req: Request, res: Response) => {
    const appointmentId = req.params.id;
    const payload = req.body;
    const user = req.user;

    const updatedAppointment = await AppointmentService.changeAppointmentStatus(
      appointmentId as string,
      payload,
      user,
    );
    sendResponse(res, {
      success: true,
      httpStatusCode: status.OK,
      message: "Appointment status updated successfully",
      data: updatedAppointment,
    });
  },
);

const getMySingleAppointment = catchAsync(
  async (req: Request, res: Response) => {
    const appointmentId = req.params.id;
    const user = req.user;

    const appointment = await AppointmentService.getMySingleAppointment(
      appointmentId as string,
      user,
    );
    sendResponse(res, {
      success: true,
      httpStatusCode: status.OK,
      message: "Appointment retrieved successfully",
      data: appointment,
    });
  },
);

const getAllAppointments = catchAsync(async (req: Request, res: Response) => {
  const appointments = await AppointmentService.getAllAppointments();
  sendResponse(res, {
    success: true,
    httpStatusCode: status.OK,
    message: "All appointments retrieved successfully",
    data: appointments,
  });
});

export const AppointmentController = {
  bookAppointment,
  getMyAppointments,
  changeAppointmentStatus,
  getMySingleAppointment,
  getAllAppointments,
};
