import status from "http-status";
import { Specialty } from "../../../generated/prisma/client";
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
  // ==========================================
  // STEP 1: Check if Doctor Exists
  // ==========================================
  // এই ID দিয়ে কোনো doctor আছে কিনা check করা এবং deleted নয় তা নিশ্চিত করা
  const existingDoctor = await prisma.doctor.findFirst({
    where: {
      id: id,
      isDeleted: false, // শুধুমাত্র active doctors update করা যাবে
    },
    include: {
      specialties: true, // বর্তমান specialties দেখার জন্য
    },
  });

  // Doctor না পাওয়া গেলে error throw করো
  if (!existingDoctor) {
    throw new AppError(
      status.NOT_FOUND,
      `Doctor with id ${id} not found or has been deleted`,
    );
  }

  // ==========================================
  // STEP 2: Validate Specialties (if provided)
  // ==========================================
  // যদি payload এ specialties থাকে তাহলে সেগুলো validate করা
  const specialties: Specialty[] = [];

  if (payload.specialties && payload.specialties.length > 0) {
    for (const specialtyId of payload.specialties) {
      const specialty = await prisma.specialty.findUnique({
        where: {
          id: specialtyId,
        },
      });

      // যদি কোনো specialty না পাওয়া যায় তাহলে error throw করো
      if (!specialty) {
        throw new AppError(
          status.BAD_REQUEST,
          `Specialty with id ${specialtyId} not found`,
        );
      }
      specialties.push(specialty);
    }
  }

  // ==========================================
  // STEP 3: Check Email Duplication (if email is being updated)
  // ==========================================
  // যদি email update করা হচ্ছে তাহলে check করো অন্য কেউ এই email use করছে কিনা
  if (payload.doctor?.email && payload.doctor.email !== existingDoctor.email) {
    // Doctor table এ check করা
    const emailExistsInDoctor = await prisma.doctor.findUnique({
      where: {
        email: payload.doctor.email,
      },
    });

    if (emailExistsInDoctor) {
      throw new AppError(
        status.CONFLICT,
        `Email ${payload.doctor.email} is already in use by another doctor`,
      );
    }

    // User table এও check করা (অন্য role এর user এর email conflict ধরার জন্য)
    const emailExistsInUser = await prisma.user.findUnique({
      where: {
        email: payload.doctor.email,
      },
    });

    if (emailExistsInUser) {
      throw new AppError(
        status.CONFLICT,
        `Email ${payload.doctor.email} is already in use`,
      );
    }
  }

  // ==========================================
  // STEP 4: Update Doctor Profile & Relations
  // ==========================================
  // Transaction ব্যবহার করছি যাতে সব operations একসাথে success/fail হয়
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 4.1: Doctor table এ profile update করা
      // শুধুমাত্র যে fields payload এ আছে সেগুলোই update হবে
      const updatedDoctor = await tx.doctor.update({
        where: {
          id: id,
        },
        data: {
          ...payload.doctor, // শুধু provided fields গুলো update হবে
        },
      });

      // 4.1.1: User table এও email/name sync করা
      // Doctor আর User table এ consistent data রাখার জন্য
      if (payload.doctor?.email || payload.doctor?.name) {
        await tx.user.update({
          where: {
            id: existingDoctor.userId,
          },
          data: {
            ...(payload.doctor.email && { email: payload.doctor.email }),
            ...(payload.doctor.name && { name: payload.doctor.name }),
          },
        });
      }

      // 4.2: Specialties update করা (যদি payload এ থাকে)
      if (payload.specialties && payload.specialties.length > 0) {
        // পুরনো specialties সব delete করে নতুন add করব
        // প্রথমে DoctorSpecialty table থেকে এই doctor এর সব entries delete করো
        await tx.doctorSpecialty.deleteMany({
          where: {
            doctorId: id,
          },
        });

        // নতুন specialties create করা
        const doctorSpecialtyData = specialties.map((specialty) => ({
          doctorId: id,
          specialtyId: specialty.id,
        }));

        // DoctorSpecialty table এ নতুন entries insert করো
        await tx.doctorSpecialty.createMany({
          data: doctorSpecialtyData,
        });
      }

      // 4.3: Updated doctor এর complete data fetch করা
      // Frontend এ response এ এই পুরো nested object পাঠাবো
      const doctor = await tx.doctor.findUnique({
        where: {
          id: updatedDoctor.id,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          email: true,
          profilePhoto: true,
          contactNumber: true,
          address: true,
          registrationNumber: true,
          experience: true,
          gender: true,
          appointmentFee: true,
          qualification: true,
          currentWorkingPlace: true,
          designation: true,
          averageRating: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
          // Related User data fetch করছি (nested relation)
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              status: true,
              emailVerified: true,
              image: true,
              isDeleted: true,
              deletedAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          // Related Specialties fetch করছি (through junction table)
          specialties: {
            select: {
              specialty: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      return doctor;
    });

    return result;
  } catch (error) {
    // ==========================================
    // STEP 5: Error Handling
    // ==========================================
    console.log("Update transaction error: ", error);
    throw error;
  }
};

const deleteDoctor = async (id: string) => {
  // ==========================================
  // STEP 1: Check if Doctor Exists
  // ==========================================
  const existingDoctor = await prisma.doctor.findFirst({
    where: {
      id: id,
      isDeleted: false,
    },
  });

  if (!existingDoctor) {
    throw new AppError(
      status.NOT_FOUND,
      `Doctor with id ${id} not found or has already been deleted`,
    );
  }

  // ==========================================
  // STEP 2: Soft Delete Doctor & User
  // ==========================================
  // Transaction ব্যবহার করছি যাতে Doctor আর User দুইটা table একসাথে update হয়
  const result = await prisma.$transaction(async (tx) => {
    // Doctor table এ isDeleted = true set করা
    await tx.doctor.update({
      where: {
        id: id,
      },
      data: {
        isDeleted: true,
      },
    });

    // User table এও soft delete করা যাতে login বন্ধ হয়
    await tx.user.update({
      where: {
        id: existingDoctor.userId,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return { message: "Doctor deleted successfully" };
  });

  return result;
};

export const doctorService = {
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
};
