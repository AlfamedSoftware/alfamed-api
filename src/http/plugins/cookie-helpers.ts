export type ParsedCookie = {
    key: string;
    value: string;
};

export function parseCookieHeader(cookieHeader: string | null): ParsedCookie[] {
    if (!cookieHeader) {
        return [];
    }

    return cookieHeader
        .split(";")
        .map((entry) => entry.trim())
        .map((entry) => {
            const separatorIndex = entry.indexOf("=");

            if (separatorIndex < 0) {
                return { key: entry, value: "" };
            }

            return {
                key: entry.slice(0, separatorIndex),
                value: entry.slice(separatorIndex + 1),
            };
        });
}

export function getCookieValueFromRequest(request: Request, cookieName: string) {
    const found = parseCookieHeader(request.headers.get("cookie")).find((cookie) => cookie.key === cookieName);

    if (!found?.value) {
        return null;
    }

    try {
        return decodeURIComponent(found.value);
    } catch {
        return found.value;
    }
}
