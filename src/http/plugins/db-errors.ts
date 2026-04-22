type DbErrorLike = {
    code?: string;
    message?: string;
    detail?: string;
    constraint?: string;
    column?: string;
    cause?: unknown;
};

function getErrorChain(error: unknown) {
    const chain: DbErrorLike[] = [];
    const visited = new Set<unknown>();
    let current: unknown = error;

    while (current && typeof current === "object" && !visited.has(current)) {
        visited.add(current);
        chain.push(current as DbErrorLike);
        current = (current as DbErrorLike).cause;
    }

    return chain;
}

export function isUniqueConstraintError(error: unknown) {
    return getErrorChain(error).some((item) => item.code === "23505");
}

export function getUniqueConstraintField(error: unknown) {
    const combined = getErrorChain(error)
        .flatMap((item) => [item.constraint, item.column, item.detail, item.message])
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    if (combined.includes("email")) {
        return "email" as const;
    }

    if (combined.includes("cpf")) {
        return "cpf" as const;
    }

    if (combined.includes("cnpj")) {
        return "cnpj" as const;
    }

    return null;
}
