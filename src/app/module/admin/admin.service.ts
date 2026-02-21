import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
  IChangeUserRolePayload,
  IChangeUserStatusPayload,
  IUpdateAdminPayload,
} from "./admin.interface";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { Role, UserStatus } from "../../../generated/prisma/enums";

const getAllAdmin = async () => {
  const admins = await prisma.admin.findMany({
    include: {
      user: true,
    },
  });
  return admins;
};

const getAdminById = async (id: string) => {
  const admin = await prisma.admin.findUnique({
    where: {
      id,
    },
    include: {
      user: true,
    },
  });
  return admin;
};

const updateAdmin = async (id: string, payload: IUpdateAdminPayload) => {
  const isAdminExits = await prisma.user.findUnique({
    where: {
      id,
    },
  });
  if (!isAdminExits) {
    throw new AppError(status.NOT_FOUND, "Admin or Super Admin not found");
  }

  const updateAdmin = await prisma.admin.update({
    where: {
      id,
    },
    data: {
      ...payload.admin,
    },
  });
  return updateAdmin;
};

const deleteAdmin = async (id: string, user: IRequestUser) => {
  const isAdminExist = await prisma.admin.findUnique({
    where: {
      id,
    },
  });

  if (!isAdminExist) {
    throw new AppError(status.NOT_FOUND, "Admin Or Super Admin not found");
  }

  if (isAdminExist.id === user.userId) {
    throw new AppError(status.BAD_REQUEST, "You cannot delete yourself");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.admin.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
    //
    await tx.user.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: UserStatus.DELETED,
      },
    });
    //
    await tx.session.deleteMany({
      where: {
        userId: isAdminExist.userId,
      },
    });
    //
    await tx.account.deleteMany({
      where: {
        userId: isAdminExist.userId,
      },
    });
    //
    const admin = await getAdminById(id);
    return admin;
  });
  return result;
};

const changeUserStatus = async (
  user: IRequestUser,
  payload: IChangeUserStatusPayload,
) => {
  // 1. Super admin can change the status of any user (admin, doctor, patient). Except himself. He cannot change his own status.

  // 2. Admin can change the status of doctor and patient. Except himself. He cannot change his own status. He cannot change the status of super admin and other admin user.

  const isAdminExists = await prisma.admin.findUniqueOrThrow({
    where: {
      email: user.email,
    },
    include: {
      user: true,
    },
  });

  const { userId, userStatus } = payload;

  const userToChangeStatus = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
  });

  const selfStatusChange = isAdminExists.userId === userId;

  if (selfStatusChange) {
    throw new AppError(status.BAD_REQUEST, "You cannot change your own status");
  }

  if (
    isAdminExists.user.role === Role.ADMIN &&
    userToChangeStatus.role === Role.SUPER_ADMIN
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot change the status of super admin. Only super admin can change the status of another super admin",
    );
  }

  if (
    isAdminExists.user.role === Role.ADMIN &&
    userToChangeStatus.role === Role.ADMIN
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot change the status of another admin. Only super admin can change the status of another admin",
    );
  }

  if (userStatus === UserStatus.DELETED) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot set user status to deleted. To delete a user, you have to use role specific delete api. For example, to delete an doctor user, you have to use delete doctor api which will set the user status to deleted and also set isDeleted to true and also delete the user session and account",
    );
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      status: userStatus,
    },
  });

  return updatedUser;
};

const changeUserRole = async (
  user: IRequestUser,
  payload: IChangeUserRolePayload,
) => {
  // 1. Super admin can change the role of only other super admin and admin user. He cannot change his own role.

  // 2. Admin cannot change role of any user

  // 3. Role of Patient and Doctor user cannot be changed by anyone. If needed, they have to be deleted and recreated with new role.

  const isSuperAdminExists = await prisma.admin.findFirstOrThrow({
    where: {
      email: user.email,
      user: {
        role: Role.SUPER_ADMIN,
      },
    },
    include: {
      user: true,
    },
  });

  const { userId, role } = payload;

  const userToChangeRole = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
  });

  const selfRoleChange = isSuperAdminExists.userId === userId;

  if (selfRoleChange) {
    throw new AppError(status.BAD_REQUEST, "You cannot change your own role");
  }

  if (
    userToChangeRole.role === Role.DOCTOR ||
    userToChangeRole.role === Role.PATIENT
  ) {
    throw new AppError(
      status.BAD_REQUEST,
      "You cannot change the role of doctor or patient user. If you want to change the role of doctor or patient user, you have to delete the user and recreate with new role",
    );
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      role,
    },
  });

  return updatedUser;
};

export const AdminService = {
  getAllAdmin,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  changeUserStatus,
  changeUserRole,
};
