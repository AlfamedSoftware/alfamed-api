import { DomainError } from "./domain-error.js";

export const internalAdminDomain = "alfamed.com";

export function hasInternalAdminEmail(email?: string | null) {
    if (!email) {
        return false;
    }

    return email.toLowerCase().endsWith(`@${internalAdminDomain}`);
}

export function assertInternalAdminAccess(context: { user?: { email?: string } }) {
    if (!hasInternalAdminEmail(context.user?.email)) {
        throw new DomainError("FORBIDDEN", "Forbidden");
    }
}
