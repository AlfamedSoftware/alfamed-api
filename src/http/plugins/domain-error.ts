export type DomainErrorCode =
    | "FORBIDDEN"
    | "UNIT_NOT_FOUND"
    | "PROFESSIONAL_NOT_FOUND"
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
    | "STATUS_NOT_FOUND";

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
