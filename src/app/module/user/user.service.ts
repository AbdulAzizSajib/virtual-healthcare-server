/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import { Role, Specialty } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import {
  ICreateAdmin,
  IcreateDoctorPayload,
  ICreateSuperAdmin,
} from "./user.interface";

const createDoctor = async (payload: IcreateDoctorPayload) => {
  // ==========================================
  // STEP 1: Validate Specialties
  // ==========================================
  // Frontend থেকে যে specialty IDs এসেছে সেগুলো database এ আছে কিনা verify করা
  // প্রতিটা specialty ID এর জন্য database query করে validate করছি
  const specialties: Specialty[] = [];

  for (const specialtyId of payload.specialties) {
    const specialty = await prisma.specialty.findUnique({
      where: {
        id: specialtyId,
      },
    });
    // যদি কোনো specialty না পাওয়া যায় তাহলে error throw করো
    if (!specialty) {
      // throw new Error(`Specialty with id ${specialtyId} not found`);
      throw new AppError(
        status.BAD_REQUEST,
        `Specialty with id ${specialtyId} not found`,
      );
    }
    // Valid specialty হলে array তে push করো (পরে doctor-specialty linking এ লাগবে)
    specialties.push(specialty);
  }

  // ==========================================
  // STEP 2: Check Email Duplication
  // ==========================================
  // এই email দিয়ে আগে কোনো user আছে কিনা check করা
  // findUnique use করছি কারণ এটা user পেলে object, না পেলে null return করে
  const userExists = await prisma.user.findUnique({
    where: {
      email: payload.doctor.email,
    },
  });

  console.log(userExists);
  // যদি user থাকে (truthy value) তাহলে error throw করে signup process বন্ধ করো
  if (userExists) {
    throw new AppError(
      status.CONFLICT,
      `User with email ${payload.doctor.email} already exists`,
    );
  }

  // ==========================================
  // STEP 3: Create User in Auth System
  // ==========================================
  // Better-auth library ব্যবহার করে authentication system এ user create করছি
  // এটা User table এ entry create করবে এবং password hash করে save করবে
  const userData = await auth.api.signUpEmail({
    body: {
      email: payload.doctor.email,
      password: payload.password,
      role: Role.DOCTOR, // User এর role DOCTOR set করছি
      name: payload.doctor.name,
      needPasswordChange: true, // First login এ password change করতে হবে
    },
  });

  // ==========================================
  // STEP 4: Create Doctor Profile & Relations
  // ==========================================
  // Transaction ব্যবহার করছি যাতে সব operations একসাথে success/fail হয়
  // কোনো একটা fail হলে সব rollback হবে (Atomicity)
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 4.1: Doctor table এ profile create করা
      // userId দিয়ে User table এর সাথে link করছি (Foreign Key)
      const doctorData = await tx.doctor.create({
        data: {
          userId: userData.user.id, // Auth থেকে পাওয়া user ID
          ...payload.doctor, // বাকি সব data spread করে insert করছি
        },
      });

      // 4.2: Doctor-Specialty many-to-many relationship create করা
      // প্রতিটা specialty এর জন্য DoctorSpecialty junction table এ entry create করছি
      const doctorSpecialtyData = specialties.map((specialty) => ({
        doctorId: doctorData.id, // এই doctor এর ID
        specialtyId: specialty.id, // প্রতিটা specialty এর ID
      }));

      // DoctorSpecialty table এ multiple entries একসাথে insert করছি
      await tx.doctorSpecialty.createMany({
        data: doctorSpecialtyData,
      });

      // 4.3: Complete doctor data fetch করা (doctor + user + specialties)
      // Frontend এ response এ এই পুরো nested object পাঠাবো
      const doctor = await tx.doctor.findUnique({
        where: {
          id: doctorData.id,
        },
        select: {
          // Doctor table এর সব fields select করছি
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
                  title: true,
                  id: true,
                },
              },
            },
          },
        },
      });
      return doctor;
    });
    return result;
  } catch (error: unknown) {
    // ==========================================
    // STEP 5: Error Handling & Cleanup
    // ==========================================
    // Transaction fail হলে এখানে আসবে
    console.log("Transaction error : ", error);

    // Auth system এ যে user create করেছিলাম সেটা delete করে cleanup করছি
    // কারণ doctor profile create হয়নি, তাই orphan user থাকবে না
    await prisma.user.delete({
      where: {
        id: userData.user.id,
      },
    });

    // Error আবার throw করছি যাতে controller/frontend এ পৌঁছায়
    throw error;
  }
};

const createAdmin = async (payload: ICreateAdmin) => {
  // Step 1: Check if user already exists
  const userExists = await prisma.user.findUnique({
    where: {
      email: payload.admin.email,
    },
  });

  if (userExists) {
    throw new Error("User with this email already exists");
  }

  // Step 2: Create user account with Better Auth
  const userData = await auth.api.signUpEmail({
    body: {
      email: payload.admin.email,
      password: payload.password,
      role: Role.ADMIN,
      name: payload.admin.name,
      needPasswordChange: true,
      rememberMe: false,
    },
  });

  // Step 3: Create admin profile in transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create admin record
      const admin = await tx.admin.create({
        data: {
          userId: userData.user.id,
          name: payload.admin.name,
          email: payload.admin.email,
          profilePhoto: payload.admin.profilePhoto ?? null,
          contactNumber: payload.admin.contactNumber,
          gender: payload.admin.gender,
        },
      });

      // Fetch created admin with user data
      const createdAdmin = await tx.admin.findUnique({
        where: { id: admin.id },
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
          contactNumber: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      });

      return createdAdmin;
    });

    return result;
  } catch (error: any) {
    // Cleanup: Delete user if admin creation fails
    console.log(error);
    await prisma.user.delete({
      where: { id: userData.user.id },
    });
    throw new Error("Failed to create admin");
  }
};

const createSuperAdmin = async (payload: ICreateSuperAdmin) => {
  // Step 1: Check if user already exists
  const userExists = await prisma.user.findUnique({
    where: {
      email: payload.superAdmin.email,
    },
  });

  if (userExists) {
    throw new Error("User with this email already exists");
  }

  // Step 2: Create user account with Better Auth
  const userData = await auth.api.signUpEmail({
    body: {
      email: payload.superAdmin.email,
      password: payload.password,
      role: Role.SUPER_ADMIN,
      name: payload.superAdmin.name,
      needPasswordChange: true,
      rememberMe: false,
    },
  });

  // Step 3: Create super admin profile in transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create admin record
      const superAdmin = await tx.superAdmin.create({
        data: {
          userId: userData.user.id,
          name: payload.superAdmin.name,
          email: payload.superAdmin.email,
          profilePhoto: payload.superAdmin.profilePhoto ?? null,
          contactNumber: payload.superAdmin.contactNumber,
          gender: payload.superAdmin.gender,
        },
      });

      // Fetch created admin with user data
      const createdAdmin = await tx.superAdmin.findUnique({
        where: { id: superAdmin.id },
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
          contactNumber: true,
          isDeleted: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      });

      return createdAdmin;
    });

    return result;
  } catch (error: any) {
    // Cleanup: Delete user if admin creation fails
    console.log(error);
    await prisma.user.delete({
      where: { id: userData.user.id },
    });
    throw new Error("Failed to create super admin");
  }
};

export const userService = {
  createDoctor,
  createAdmin,
  createSuperAdmin,
};
