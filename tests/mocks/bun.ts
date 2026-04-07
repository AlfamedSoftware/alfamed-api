import { randomUUID } from "node:crypto";

export const randomUUIDv7 = () =>
    typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : randomUUID();

export const password = {
    hash: async (value: string) => value,
    verify: async ({ password: plain, hash }: { password: string; hash: string }) =>
        plain === hash,
};
