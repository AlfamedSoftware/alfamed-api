export type DomainErrorCode =
    | "FORBIDDEN"
    | "UNIT_NOT_FOUND"
    | "PROFESSIONAL_NOT_FOUND";

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
