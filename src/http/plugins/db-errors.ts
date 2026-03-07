export function isUniqueConstraintError(error: unknown) {
    if (!(error instanceof Error)) {
        return false;
    }

    const errorWithCode = error as Error & { code?: string };

    return errorWithCode.code === "23505";
}
