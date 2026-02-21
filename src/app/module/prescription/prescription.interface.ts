export interface ICreatePrescriptionPayload {
  instructions: string;
  followUpDate: Date;
  appointmentId: string;
}

export interface IUpdatePrescriptionPayload {
  followUpDate?: Date;
  instructions?: string;
}
