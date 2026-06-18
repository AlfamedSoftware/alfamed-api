import { DomainError } from "../../http/plugins/domain-error.js";
import { CLINIC_TZ, createLocalDateTime, overlaps } from "../appointments/appointments.utils.js";
import type { IPatientAppointmentsRepository, ScheduleRow, TimeRange } from "./patient-appointments.repository.js";
import type { PatientCreateAppointmentInput, Slot } from "./patient-appointments.schemas.js";

export function generateSlots(
    scheduleRules: ScheduleRow[],
    bookedAppointments: TimeRange[],
    blocks: TimeRange[],
    date: string,
): Slot[] {
    const slots: Slot[] = [];
    const durationMs = (minutes: number) => minutes * 60_000;

    for (const rule of scheduleRules) {
        const windowStart = createLocalDateTime(date, rule.startTime);
        const windowEnd = createLocalDateTime(date, rule.endTime);
        const stepMs = durationMs(rule.appointmentDurationMinutes);

        let slotStart = new Date(windowStart);

        while (true) {
            const slotEnd = new Date(slotStart.getTime() + stepMs);

            if (slotEnd > windowEnd) break;

            const slotInterval = { start: slotStart, end: slotEnd };

            const isBusy =
                bookedAppointments.some((appt) => overlaps(slotInterval, { start: appt.startAt, end: appt.endAt })) ||
                blocks.some((block) => overlaps(slotInterval, { start: block.startAt, end: block.endAt }));

            slots.push({
                startAt: slotStart.toISOString(),
                endAt: slotEnd.toISOString(),
                available: !isBusy,
            });

            slotStart = new Date(slotStart.getTime() + stepMs);
        }
    }

    return slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export class PatientAppointmentsService {
    constructor(private readonly repository: IPatientAppointmentsRepository) {}

    async getSlots(professionalId: string, unitId: string, date: string): Promise<Slot[]> {
        const professionalUnit = await this.repository.findActiveProfessionalUnit(professionalId, unitId);

        if (!professionalUnit) {
            throw new DomainError("PROFESSIONAL_UNIT_NOT_FOUND", "Profissional não encontrado");
        }

        const dayOfWeek = new Date(`${date}T00:00:00${CLINIC_TZ}`).getDay();
        const scheduleRules = await this.repository.getSchedulesForDay(professionalUnit.professionalUnitId, dayOfWeek);

        if (scheduleRules.length === 0) return [];

        const dayStart = new Date(`${date}T00:00:00${CLINIC_TZ}`);
        const dayEnd = new Date(`${date}T23:59:59${CLINIC_TZ}`);

        const [bookedAppointments, blocks] = await Promise.all([
            this.repository.getAppointmentsForDay(professionalUnit.professionalUnitId, dayStart, dayEnd),
            this.repository.getBlocksForDay(professionalUnit.professionalUnitId, dayStart, dayEnd),
        ]);

        return generateSlots(scheduleRules, bookedAppointments, blocks, date);
    }

    async bookSlot(userId: string, input: PatientCreateAppointmentInput): Promise<{
        id: string;
        patientId: string;
        professionalUnitId: string;
        startAt: string;
        endAt: string;
        reason: string | null;
    }> {
        const patientId = await this.repository.findPatientIdByUserId(userId);

        if (!patientId) {
            throw new DomainError("PATIENT_NOT_FOUND", "Paciente não encontrado para este usuário");
        }

        const professionalUnit = await this.repository.findActiveProfessionalUnit(input.professionalId, input.unitId);

        if (!professionalUnit) {
            throw new DomainError("PROFESSIONAL_UNIT_NOT_FOUND", "Profissional não encontrado");
        }

        const startAt = new Date(input.startAt);
        const date = input.startAt.slice(0, 10);
        const dayOfWeek = new Date(`${date}T00:00:00${CLINIC_TZ}`).getDay();

        const scheduleRules = await this.repository.getSchedulesForDay(professionalUnit.professionalUnitId, dayOfWeek);

        const coveringRule = scheduleRules.find((rule) => {
            const windowStart = createLocalDateTime(date, rule.startTime);
            const windowEnd = createLocalDateTime(date, rule.endTime);
            return startAt >= windowStart && startAt < windowEnd;
        });

        if (!coveringRule) {
            throw new DomainError("NO_SLOTS_AVAILABLE", "Horário inválido: fora do horário de atendimento");
        }

        const slotOriginMs = createLocalDateTime(date, coveringRule.startTime).getTime();
        const diff = startAt.getTime() - slotOriginMs;
        const stepMs = coveringRule.appointmentDurationMinutes * 60_000;

        if (diff < 0 || diff % stepMs !== 0) {
            throw new DomainError("NO_SLOTS_AVAILABLE", "Horário inválido: não corresponde a um slot válido");
        }

        const endAt = new Date(startAt.getTime() + stepMs);

        const windowEnd = createLocalDateTime(date, coveringRule.endTime);
        if (endAt > windowEnd) {
            throw new DomainError("NO_SLOTS_AVAILABLE", "Horário inválido: slot ultrapassa o fim do atendimento");
        }

        const dayStart = new Date(`${date}T00:00:00${CLINIC_TZ}`);
        const dayEnd = new Date(`${date}T23:59:59${CLINIC_TZ}`);

        const [bookedAppointments, blocks] = await Promise.all([
            this.repository.getAppointmentsForDay(professionalUnit.professionalUnitId, dayStart, dayEnd),
            this.repository.getBlocksForDay(professionalUnit.professionalUnitId, dayStart, dayEnd),
        ]);

        const slotInterval = { start: startAt, end: endAt };

        const isOccupied =
            bookedAppointments.some((appt) => overlaps(slotInterval, { start: appt.startAt, end: appt.endAt })) ||
            blocks.some((block) => overlaps(slotInterval, { start: block.startAt, end: block.endAt }));

        if (isOccupied) {
            throw new DomainError("NO_SLOTS_AVAILABLE", "Horário não disponível");
        }

        const statusId = await this.repository.findOrCreateScheduledStatus();

        const created = await this.repository.createAppointment({
            patientId,
            professionalUnitId: professionalUnit.professionalUnitId,
            specialtyId: coveringRule.specialtyId ?? null,
            startAt,
            endAt,
            reason: input.reason ?? null,
            statusId,
        });

        return {
            id: created.id,
            patientId: created.patientId,
            professionalUnitId: created.professionalUnitId,
            startAt: created.startAt.toISOString(),
            endAt: created.endAt.toISOString(),
            reason: created.reason,
        };
    }
}
