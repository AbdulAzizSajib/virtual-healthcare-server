import status from "http-status";
import { UserStatus } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { IUpdateDoctorPayload } from "./doctor.interface";

const getAllDoctors = async () => {
  const result = await prisma.doctor.findMany({
    where: {
      isDeleted: false, // শুধুমাত্র active doctors দেখাবে
    },
    include: {
      user: true,
      specialties: {
        include: {
          specialty: true,
        },
      },
    },
  });

  // Transform specialties (flatten structure)
  const doctors = result.map((doctor) => ({
    ...doctor,
    specialties: doctor.specialties.map((s) => s.specialty),
  }));

  return doctors;
};

const getDoctorById = async (id: string) => {
  const result = await prisma.doctor.findUnique({
    where: {
      id: id,
      isDeleted: false, // শুধুমাত্র active doctor দেখাবে
    },
    include: {
      user: true,
      specialties: {
        include: {
          specialty: true,
        },
      },
    },
  });
  if (!result) {
    throw new AppError(
      status.NOT_FOUND,
      `Doctor with id ${id} not found or has been deleted`,
    );
  }

  return {
    ...result,
    specialties: result.specialties.map((s) => s.specialty), // Flatten specialties
  };
};

const updateDoctor = async (id: string, payload: IUpdateDoctorPayload) => {
  const existingDoctor = await prisma.doctor.findFirst({
    where: {
      id: id,
      isDeleted: false,
    },
    include: {
      specialties: true,
    },
  });

  if (!existingDoctor) {
    throw new AppError(
      status.NOT_FOUND,
      `Doctor with id ${id} not found or has been deleted`,
    );
  }

  const { doctor: doctorData, specialties } = payload;

  try {
    await prisma.$transaction(async (tx) => {
      if (doctorData) {
        await tx.doctor.update({
          where: {
            id: id,
          },
          data: {
            ...doctorData,
          },
        });
      }

      if (specialties && specialties.length > 0) {
        for (const specialty of specialties) {
          const { specialtyId, shouldDelete } = specialty;
          if (shouldDelete) {
            await tx.doctorSpecialty.delete({
              where: {
                uq_doctor_specialty_doctorId_specialtyId: {
                  doctorId: id,
                  specialtyId,
                },
              },
            });
          } else {
            await tx.doctorSpecialty.upsert({
              where: {
                uq_doctor_specialty_doctorId_specialtyId: {
                  doctorId: id,
                  specialtyId,
                },
              },
              create: {
                doctorId: id,
                specialtyId,
              },
              update: {},
            });
          }
        }
      }
    });

    const doctor = await getDoctorById(id);

    return doctor;
  } catch (error) {
    console.log("Update transaction error: ", error);
    throw error;
  }
};

const deleteDoctor = async (id: string) => {
  const existingDoctor = await prisma.doctor.findFirst({
    where: {
      id: id,
      isDeleted: false,
    },
    include: { user: true },
  });

  if (!existingDoctor) {
    throw new AppError(
      status.NOT_FOUND,
      `Doctor with id ${id} not found or has already been deleted`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.doctor.update({
      where: {
        id: id,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await tx.user.update({
      where: {
        id: existingDoctor.userId,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });

    await tx.session.deleteMany({
      where: { userId: existingDoctor.userId },
    });
    await tx.doctorSpecialty.deleteMany({
      where: { doctorId: id },
    });
  });

  return { message: "Doctor deleted successfully" };
};

export const doctorService = {
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};
