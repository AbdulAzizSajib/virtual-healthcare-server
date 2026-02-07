import status from "http-status";
import { Role, Specialty } from "../../../generated/prisma/client";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { IcreateDoctorPayload } from "./user.interface";

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
  } catch (error) {
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

export const userService = {
  createDoctor,
};
