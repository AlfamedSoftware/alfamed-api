import { buildApp } from "../src/app";
import { db } from "../src/db/client";
import { betterAuthPlugin } from "../src/http/plugins/better-auth";
import { ProfessionalsRepository } from "../src/modules/professionals/professionals.repository";
import { UsersRepository } from "../src/modules/users/users.repository";

type ServerlessRequest = {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined | null>;
    body?: unknown;
};

type ServerlessResponse = {
    getHeader: (name: string) => string | string[] | number | undefined;
    setHeader: (name: string, value: string | string[]) => void;
    status: (statusCode: number) => ServerlessResponse;
    send: (body: Buffer) => void;
    end: () => void;
};

const usersRepository = new UsersRepository(db);
const professionalsRepository = new ProfessionalsRepository(db);

const appPromise = buildApp({
    usersRepository,
    professionalsRepository,
    authPlugin: betterAuthPlugin,
    withDocs: true,
});

function appendResponseHeaders(res: ServerlessResponse, response: Response) {
    response.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
            const existing = res.getHeader("set-cookie");

            if (!existing) {
                res.setHeader("set-cookie", value);
                return;
            }

            const cookies = Array.isArray(existing) ? existing : [String(existing)];
            res.setHeader("set-cookie", [...cookies, value]);
            return;
        }

        res.setHeader(key, value);
    });
}

function toRequestUrl(req: ServerlessRequest) {
    const host = req.headers.host ?? "localhost";
    const protocol = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
    const path = req.url ?? "/";

    return `${protocol}://${host}${path}`;
}

function toRequestHeaders(req: ServerlessRequest) {
    const headers = new Headers();

    Object.entries(req.headers).forEach(([key, value]) => {
        if (typeof value === "undefined") {
            return;
        }

        if (Array.isArray(value)) {
            headers.set(key, value.join(","));
            return;
        }

        headers.set(key, String(value));
    });

    return headers;
}

function toRequestBody(req: ServerlessRequest, headers: Headers): BodyInit | undefined {
    if (req.method === "GET" || req.method === "HEAD") {
        return undefined;
    }

    if (typeof req.body === "undefined" || req.body === null) {
        return undefined;
    }

    if (typeof req.body === "string") {
        return req.body;
    }

    if (Buffer.isBuffer(req.body)) {
        return new Uint8Array(req.body);
    }

    if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
    }

    return JSON.stringify(req.body);
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
    const app = await appPromise;
    const headers = toRequestHeaders(req);

    const request = new Request(toRequestUrl(req), {
        method: req.method,
        headers,
        body: toRequestBody(req, headers),
    });

    const response = await app.handle(request);

    appendResponseHeaders(res, response);
    res.status(response.status);

    const body = await response.arrayBuffer();

    if (body.byteLength === 0) {
        res.end();
        return;
    }

    res.send(Buffer.from(body));
}
