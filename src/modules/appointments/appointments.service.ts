import { DomainError, isDomainError } from "../../http/plugins/domain-error.js";
import { assertUserHasUnitAccess } from "../../http/plugins/unit-access.js";
import type {
    AppointmentsRepository,
    AvailabilityQuery,
    CreateScheduleInput,
    UpdateScheduleInput,
} from "./appointments.repository.js";

const APPOINTMENT_STATUS_PENDING_PROFESSIONAL = "pending_professional";
const APPOINTMENT_STATUS_CONFIRMED = "confirmed";
const APPOINTMENT_STATUS_REJECTED = "rejected";
const APPOINTMENT_STATUS_COUNTER_PROPOSED = "counter_proposed";

const REQUEST_STATUS_PENDING_PROFESSIONAL = "pending_professional";
const REQUEST_STATUS_CONFIRMED = "confirmed";
const REQUEST_STATUS_REJECTED = "rejected";
const REQUEST_STATUS_COUNTER_PROPOSED = "counter_proposed";

const COUNTER_PROPOSAL_TYPE_PREFIX = "counter_proposal:";
const BOOKING_REQUEST_TYPE = "booking_request";

function parseCounterProposalScheduleId(type: string) {
    if (!type.startsWith(COUNTER_PROPOSAL_TYPE_PREFIX)) {
        return null;
    }

    return type.slice(COUNTER_PROPOSAL_TYPE_PREFIX.length) || null;
}

export class AppointmentsService {
    constructor(
        private readonly appointmentsRepository: AppointmentsRepository,
        private readonly hasUserAccessToUnitChecker: (userId: string, unitId: string) => Promise<boolean>,
    ) {}

    async createSchedule(requestUserId: string, unitId: string, data: CreateScheduleInput) {
        await assertUserHasUnitAccess(requestUserId, unitId, this.hasUserAccessToUnitChecker);

        const professionalId = await this.appointmentsRepository.findProfessionalIdByUserId(requestUserId);
        const professionalUnit = await this.appointmentsRepository.findProfessionalUnit(data.professionalUnitId);

        if (!professionalId || !professionalUnit) {
            throw new DomainError("FORBIDDEN", "Forbidden");
        }

        if (professionalUnit.unitId !== unitId || professionalUnit.professionalId !== professionalId) {
            throw new DomainError("FORBIDDEN", "Forbidden");
        }

        return this.appointmentsRepository.createSchedule(data);
    }

    async updateSchedule(requestUserId: string, scheduleId: string, data: UpdateScheduleInput) {
        const schedule = await this.appointmentsRepository.findScheduleContextById(scheduleId);

        if (!schedule) {
            throw new DomainError("SCHEDULE_NOT_FOUND", "Schedule not found");
        }

        await assertUserHasUnitAccess(requestUserId, schedule.unitId, this.hasUserAccessToUnitChecker);

        const professionalId = await this.appointmentsRepository.findProfessionalIdByUserId(requestUserId);
        if (!professionalId || schedule.professionalId !== professionalId) {
            throw new DomainError("FORBIDDEN", "Forbidden");
        }

        if (data.professionalUnitId) {
            const professionalUnit = await this.appointmentsRepository.findProfessionalUnit(data.professionalUnitId);
            if (!professionalUnit) {
                throw new DomainError("FORBIDDEN", "Forbidden");
            }
            if (professionalUnit.unitId !== schedule.unitId || professionalUnit.professionalId !== professionalId) {
                throw new DomainError("FORBIDDEN", "Forbidden");
            }
        }

        const updated = await this.appointmentsRepository.updateSchedule(scheduleId, data);

        if (!updated) {
            throw new DomainError("SCHEDULE_NOT_FOUND", "Schedule not found");
        }

        return updated;
    }

    async listAvailability(query: AvailabilityQuery) {
        return this.appointmentsRepository.listAvailability(query);
    }

    async createAppointmentRequest(requestUserId: string, scheduleId: string) {
        const patientId = await this.appointmentsRepository.findPatientIdByUserId(requestUserId);

        if (!patientId) {
            throw new DomainError("FORBIDDEN", "Forbidden");
        }

        return this.appointmentsRepository.createAppointmentRequest({
            patientId,
            scheduleId,
            type: BOOKING_REQUEST_TYPE,
            requestStatus: REQUEST_STATUS_PENDING_PROFESSIONAL,
            appointmentStatus: APPOINTMENT_STATUS_PENDING_PROFESSIONAL,
        });
    }

    async getAppointmentRequest(requestUserId: string, requestId: string) {
        const request = await this.appointmentsRepository.findRequestById(requestId);

        if (!request) {
            throw new DomainError("REQUEST_NOT_FOUND", "Request not found");
        }

        const professionalId = await this.appointmentsRepository.findProfessionalIdByUserId(requestUserId);
        const canViewAsProfessional =
            !!professionalId &&
            professionalId === request.professionalId &&
            (await this.hasUserAccessToUnitChecker(requestUserId, request.unitId));

        const canViewAsPatient = request.patientUserId === requestUserId;

        if (!canViewAsProfessional && !canViewAsPatient) {
            throw new DomainError("FORBIDDEN", "Forbidden");
        }

        return request;
    }

    async confirmRequest(requestUserId: string, requestId: string) {
        const request = await this.getProfessionalOwnedRequest(requestUserId, requestId);
        this.assertRequestStatus(request.status, [REQUEST_STATUS_PENDING_PROFESSIONAL]);

        await this.appointmentsRepository.updateRequestStatus({
            requestId,
            newStatus: REQUEST_STATUS_CONFIRMED,
            changedBy: requestUserId,
        });

        await this.appointmentsRepository.updateAppointmentStatus({
            appointmentId: request.appointmentId,
            newStatusId: APPOINTMENT_STATUS_CONFIRMED,
            changedBy: requestUserId,
        });
    }

    async rejectRequest(requestUserId: string, requestId: string, observation?: string) {
        const request = await this.getProfessionalOwnedRequest(requestUserId, requestId);
        this.assertRequestStatus(request.status, [REQUEST_STATUS_PENDING_PROFESSIONAL, REQUEST_STATUS_COUNTER_PROPOSED]);

        await this.appointmentsRepository.updateRequestStatus({
            requestId,
            newStatus: REQUEST_STATUS_REJECTED,
            changedBy: requestUserId,
            observation,
        });

        await this.appointmentsRepository.updateAppointmentStatus({
            appointmentId: request.appointmentId,
            newStatusId: APPOINTMENT_STATUS_REJECTED,
            changedBy: requestUserId,
            observation,
        });
    }

    async counterProposeRequest(
        requestUserId: string,
        requestId: string,
        proposedScheduleId: string,
        observation?: string,
    ) {
        const request = await this.getProfessionalOwnedRequest(requestUserId, requestId);
        this.assertRequestStatus(request.status, [REQUEST_STATUS_PENDING_PROFESSIONAL]);

        const proposedSchedule = await this.appointmentsRepository.findScheduleContextById(proposedScheduleId);
        if (!proposedSchedule) {
            throw new DomainError("SCHEDULE_NOT_FOUND", "Schedule not found");
        }
        if (proposedSchedule.unitId !== request.unitId || proposedSchedule.professionalId !== request.professionalId) {
            throw new DomainError("INVALID_COUNTER_PROPOSAL", "Invalid counter proposal");
        }

        await this.appointmentsRepository.updateAppointmentStatus({
            appointmentId: request.appointmentId,
            newStatusId: APPOINTMENT_STATUS_COUNTER_PROPOSED,
            changedBy: requestUserId,
            observation,
        });

        await this.appointmentsRepository.setCounterProposal({
            requestId,
            newStatus: REQUEST_STATUS_COUNTER_PROPOSED,
            proposedScheduleId,
            changedBy: requestUserId,
            observation,
        });
    }

    async patientAcceptCounterProposal(requestUserId: string, requestId: string) {
        const request = await this.getPatientOwnedRequest(requestUserId, requestId);
        this.assertRequestStatus(request.status, [REQUEST_STATUS_COUNTER_PROPOSED]);

        const proposedScheduleId = parseCounterProposalScheduleId(request.type);
        if (!proposedScheduleId) {
            throw new DomainError("INVALID_COUNTER_PROPOSAL", "Invalid counter proposal");
        }

        await this.appointmentsRepository.moveAppointmentToSchedule({
            appointmentId: request.appointmentId,
            fromScheduleId: request.scheduleId,
            toScheduleId: proposedScheduleId,
        });

        await this.appointmentsRepository.updateRequestStatus({
            requestId,
            newStatus: REQUEST_STATUS_CONFIRMED,
            changedBy: requestUserId,
        });

        await this.appointmentsRepository.updateAppointmentStatus({
            appointmentId: request.appointmentId,
            newStatusId: APPOINTMENT_STATUS_CONFIRMED,
            changedBy: requestUserId,
        });
    }

    async patientRejectCounterProposal(requestUserId: string, requestId: string, observation?: string) {
        const request = await this.getPatientOwnedRequest(requestUserId, requestId);
        this.assertRequestStatus(request.status, [REQUEST_STATUS_COUNTER_PROPOSED]);

        await this.appointmentsRepository.updateRequestStatus({
            requestId,
            newStatus: REQUEST_STATUS_REJECTED,
            changedBy: requestUserId,
            observation,
        });

        await this.appointmentsRepository.updateAppointmentStatus({
            appointmentId: request.appointmentId,
            newStatusId: APPOINTMENT_STATUS_REJECTED,
            changedBy: requestUserId,
            observation,
        });
    }

    private async getProfessionalOwnedRequest(requestUserId: string, requestId: string) {
        const request = await this.appointmentsRepository.findRequestById(requestId);
        if (!request) {
            throw new DomainError("REQUEST_NOT_FOUND", "Request not found");
        }

        await assertUserHasUnitAccess(requestUserId, request.unitId, this.hasUserAccessToUnitChecker);

        const requesterProfessionalId = await this.appointmentsRepository.findProfessionalIdByUserId(requestUserId);
        if (!requesterProfessionalId || requesterProfessionalId !== request.professionalId) {
            throw new DomainError("FORBIDDEN", "Forbidden");
        }

        return request;
    }

    private async getPatientOwnedRequest(requestUserId: string, requestId: string) {
        const request = await this.appointmentsRepository.findRequestById(requestId);
        if (!request) {
            throw new DomainError("REQUEST_NOT_FOUND", "Request not found");
        }

        if (request.patientUserId !== requestUserId) {
            throw new DomainError("FORBIDDEN", "Forbidden");
        }

        return request;
    }

    private assertRequestStatus(currentStatus: string, allowedStatus: string[]) {
        if (!allowedStatus.includes(currentStatus)) {
            throw new DomainError("INVALID_STATUS_TRANSITION", "Invalid status transition");
        }
    }
}

export function isConflictDomainError(error: unknown) {
    return (
        isDomainError(error, "NO_SLOTS_AVAILABLE")
        || isDomainError(error, "INVALID_STATUS_TRANSITION")
        || isDomainError(error, "INVALID_COUNTER_PROPOSAL")
    );
}
