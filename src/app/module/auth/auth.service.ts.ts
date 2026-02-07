import status from "http-status";
import { UserStatus } from "../../../generated/prisma/enums";
import AppError from "../../errorHelpers/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";

interface IRegisterPatientPayload {
  name: string;
  email: string;
  password: string;
}

const registerPatient = async (payload: IRegisterPatientPayload) => {
  const { name, email, password } = payload;
  const data = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });

  if (!data.user) {
    throw new AppError(status.BAD_REQUEST, "Failed to register patient");
  }
  // create patient profile in Transaction after sign uu of paitent in User Model
  try {
    const patientProfile = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: {
          userId: data.user.id,
          name: data.user.name,
          email: data.user.email,
        },
      });
      return patient;
    });

    return {
      ...data,
      patientProfile,
    };
  } catch (error) {
    // If patient profile creation fails, we should consider rolling back the user creation as well, but since we are using a third-party auth service, we might not have control over that.
    // In a real-world scenario, you would want to implement a compensation mechanism to handle such cases.
    console.error("Error creating patient profile:", error);
    await prisma.user.delete({
      where: { id: data.user.id },
    });
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to create patient profile after registration",
    );
  }
};

interface ILoginUserPayload {
  email: string;
  password: string;
}

const loginUser = async (payload: ILoginUserPayload) => {
  const { email, password } = payload;
  const data = await auth.api.signInEmail({
    body: {
      email,
      password,
    },
  });

  if (data.user.status === UserStatus.BLOCKED) {
    throw new AppError(
      status.FORBIDDEN,
      "Your account is blocked. Please contact support.",
    );
  }

  if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
    throw new AppError(
      status.FORBIDDEN,
      "Your account has been deleted. Please contact support.",
    );
  }

  return data;
};

export const authService = {
  registerPatient,
  loginUser,
};
