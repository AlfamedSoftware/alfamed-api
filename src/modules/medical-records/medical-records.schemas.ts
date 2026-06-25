import { z } from "zod";

export const medicalRecordsErrorSchema = z.object({
    message: z.string(),
});

export const medicalRecordUserSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    socialName: z.string().nullable(),
    email: z.string(),
    phone: z.string(),
    cpf: z.string(),
    birthdate: z.string().datetime(),
    sex: z.string().nullable(),
    isActive: z.boolean(),
});

export const medicalRecordScheduleSchema = z.object({
    id: z.string().uuid(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    durationMinutes: z.number(),
    slots: z.number(),
    emptySlots: z.number(),
    allocatedSlots: z.number(),
    isActive: z.boolean(),
});

export const medicalRecordScheduleSlotSchema = z.object({
    id: z.string().uuid(),
    startTime: z.string(),
    endTime: z.string(),
    isAvailable: z.boolean(),
    isActive: z.boolean(),
});

export const medicalRecordAppointmentStatusSchema = z.object({
    id: z.string().uuid(),
    code: z.number(),
    description: z.string(),
    isActive: z.boolean(),
});

export const medicalRecordSpecialtySchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    isActive: z.boolean(),
});

export const medicalRecordProcedureSchema = z.object({
    id: z.string().uuid(),
    type: z.number(),
    description: z.string(),
    observation: z.string().nullable(),
    code: z.string(),
    price: z.string(),
    isActive: z.boolean(),
});

export const medicalRecordUnitSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    cnpj: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    isActive: z.boolean(),
});

export const medicalRecordProfessionalSchema = z.object({
    id: z.string().uuid(),
    crm: z.string().nullable(),
    isActive: z.boolean(),
});

export const medicalRecordProfessionalUserSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    socialName: z.string().nullable(),
    email: z.string(),
    phone: z.string(),
    cpf: z.string(),
    sex: z.string().nullable(),
    isActive: z.boolean(),
});

export const medicalRecordAppointmentSchema = z.object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    professionalUnitId: z.string().uuid(),
    scheduleSlotId: z.string().uuid(),
    startAt: z.string().datetime().nullable(),
    endAt: z.string().datetime().nullable(),
    diagnostics: z.string().nullable(),
    evolution: z.string().nullable(),
    clinicNotes: z.string().nullable(),
    statusId: z.string().uuid(),
    isActive: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    schedules: medicalRecordScheduleSchema,
    schedule_slots: medicalRecordScheduleSlotSchema,
    appointment_status: medicalRecordAppointmentStatusSchema,
    specialties: medicalRecordSpecialtySchema,
    procedures: medicalRecordProcedureSchema,
    units: medicalRecordUnitSchema,
    professionals: medicalRecordProfessionalSchema,
    professional_user: medicalRecordProfessionalUserSchema,
});

export const listPatientMedicalRecordsResponseSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    socialName: z.string().nullable(),
    email: z.string(),
    phone: z.string(),
    cpf: z.string(),
    birthdate: z.string().datetime(),
    sex: z.string().nullable(),
    isActive: z.boolean(),
    appointments: z.array(medicalRecordAppointmentSchema),
});
