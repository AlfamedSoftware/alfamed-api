export type DomainErrorCode =
    | "FORBIDDEN"
    | "USER_NOT_FOUND"
    | "UNIT_NOT_FOUND"
    | "PROFESSIONAL_NOT_FOUND"
    | "PROFESSIONAL_UNIT_NOT_FOUND"
    | "PROFESSIONAL_UNIT_ALREADY_EXISTS"
    | "PROFESSIONAL_UNIT_ROLE_NOT_FOUND"
    | "EMAIL_ALREADY_EXISTS"
    | "CPF_ALREADY_EXISTS"
    | "ROLE_NOT_FOUND"
    | "USER_ALREADY_LINKED_TO_PATIENT"
    | "PATIENT_NOT_FOUND"
    | "PATIENT_ALREADY_EXISTS"
    | "SPECIALTY_NOT_FOUND"
    | "SPECIALTY_LINK_NOT_FOUND"
    | "SCHEDULE_NOT_FOUND"
    | "REQUEST_NOT_FOUND"
    | "NO_SLOTS_AVAILABLE"
    | "INVALID_STATUS_TRANSITION"
    | "INVALID_COUNTER_PROPOSAL"
    | "STATUS_NOT_FOUND"
    | "UNIT_HAS_LINKED_PROFESSIONALS"
    | "UPM_USER_NOT_FOUND"
    | "PROCEDURE_CODE_ALREADY_EXISTS";

export class DomainError extends Error {
    constructor(
        public readonly code: DomainErrorCode,
        message: string,
    ) {
        super(message);
        this.name = "DomainError";
    }
}

export function isDomainError(error: unknown, code?: DomainErrorCode): error is DomainError {
    if (!(error instanceof DomainError)) {
        return false;
    }

    if (!code) {
        return true;
    }

    return error.code === code;
}
