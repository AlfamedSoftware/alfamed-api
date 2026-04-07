import { t } from "elysia";

export const patientSchema = t.Object({
    id: t.String(),
    userId: t.String(),
    isActive: t.Boolean(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
});

export const createPatientSchema = t.Object({
    userId: t.String(),
});

export const patientResponseSchema = t.Object({
    id: t.String(),
    userId: t.String(),
    isActive: t.Boolean(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
});
